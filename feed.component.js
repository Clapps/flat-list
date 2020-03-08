/* eslint-disable max-len */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Ionicons';

import { HEADER_MENU_COLOR, NAVIGATION_ACTIVE_ICON_COLOR, THIRD_COLOR } from '../../../constants/style.constants';
import Post from '../../../components/Post/Post.container';
import InitialPost from '../../../components/Post/InitialPost.component';
import {
  ADD,
  COMMUNITY_GUIDELINES,
  EXTERNAL_PROFILE,
  INTERESTS_AND_ACTIVITIES,
  PHOTO_UPLOAD_FEED,
  PIN, PROFILE, PROMO, REGISTRATION_4,
  SCENE_NEGOTIATION, SET_EMAIL_SCREEN, SETTINGS,
  SHARE_THOUGHTS, SUBSCRIPTION_LIST, SUBSCRIPTIONS_AND_PROMOS_SCREEN, UPDATE_REQUIRED,
} from '../../../constants/screen.constants';
import Card from '../../../components/UI/Card/Card.component';
import { genericAlert } from '../../../utils/showGenericAlert';
import Virtual from '../../../hoc/Virtual/Virtual';

import PostLoadingSkeleton from '../../../components/Post/PostLoadingSkeleton.component';
import SimplePostLoadingSkeleton from '../../../components/Post/SimplePostLoadingSkeleton.component';
import CardSilder from '../../../components/UI/CardSlider.component';

import styles from './Feed.styles';
import NoGreyFont from '../../../Icons/NoGrey/icons';
import { renderUploadModal } from '../../../utils/upload.utils';
import {
  FEED_SCROLL_TO_TOP,
  ON_GET_NEW_POSTS,
  setNavigationAction,
} from '../../navigation.utils';
import { noop } from '../../../utils/helpers';
import PromoPost from '../../../components/Post/PromoPost.component';
import { getSubscription } from '../../../ducks/subscriptions/subscriptions.service';
import MyAvatar from '../../../components/UI/Avatar/MyAvatar/MyAvatar.container';

const PAGE_SIZE = 10;
const PENDING_POSTS_FOR_NEXT_PAGE = 6;
const limitScrollHeightToGetOthers = (currentPage) => ((currentPage * PAGE_SIZE) - PENDING_POSTS_FOR_NEXT_PAGE) / (currentPage * PAGE_SIZE);

let getNewPostsOnSateChange = noop;

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    getNewPostsOnSateChange();
  }
});

class Feed extends Component {
  state = {
    getPostsInitialTime: 0,
    currentOldPostsPage: 1,
  };

  handleDeepLinks = async (props) => {
    const {
      onRunDeeplink, wasRunDeeplink, sceneInvite, inviteCode, giftPromo, onBuyGift, navigation,
    } = props;

    if (wasRunDeeplink) {
      return;
    }

    if (sceneInvite) {
      onRunDeeplink();
      navigation.push(SCENE_NEGOTIATION, { scene: sceneInvite });
    }

    if (inviteCode) {
      onRunDeeplink();
      navigation.push(SUBSCRIPTION_LIST, { code: inviteCode });
    }

    if (giftPromo) {
      onRunDeeplink();
      const response = await getSubscription(giftPromo.giftId);

      response.data.promoId = giftPromo.promoId;
      response.data.codeIndex = giftPromo.index;
      response.data.userId = giftPromo.userId;
      response.data.giftId = giftPromo.giftId;

      onBuyGift(response.data);
    }
  };

  async componentWillMount() {
    const currentTime = new Date().getTime();

    setNavigationAction(FEED_SCROLL_TO_TOP, this.scrollToTop);
    setNavigationAction(ON_GET_NEW_POSTS, this.getNewPosts);

    this.setState({ getPostsInitialTime: currentTime });

    getNewPostsOnSateChange = this.getNewPosts;
  }

  componentWillReceiveProps(nextProps) {
    this.handleDeepLinks(nextProps);
  }

  scrollToTop = () => {
    if (this.scroll) {
      this.scroll.scrollTo({
        x: 0,
        y: 0,
        animated: true,
      });
    }
  };

  renderModal = () => {
    return renderUploadModal(
      (image, imageUrl) => {
        this.modal.toggleModalVisible();
        this.props.navigation.navigate(PHOTO_UPLOAD_FEED, {
          image: {
            ...image,
            imageUrl,
          },
        });
      },
      (ref) => {
        this.modal = ref;
      },
    );
  };

  navigateToProfile = (userName, userId) => {
    const { onFindUser } = this.props;
    onFindUser(userName);
    this.props.navigation.push(EXTERNAL_PROFILE, { userId });
  };

  navigateToMyProfile = () => {
    this.props.navigation.navigate(PROFILE);
  };

  goToWeb = (url) => {
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          genericAlert(`Don't know how to open URI: ${url}`);
        }
      });
  };

  renderPost = (item) => {
    const { navigation } = this.props;
    switch (item.type) {
      case 'ACTIVATED_PROMO_FROM_LINK':
        return (
          <PromoPost
            post={item}
            onTap={() => noop()}
          />
        );
      case 'PROMO_FEED':
      case 'UPGRADED_PROMO':
      case 'REMIND_PROMO':
        return (
          <PromoPost
            post={item}
            onTap={() => navigation.push(SUBSCRIPTIONS_AND_PROMOS_SCREEN)}
          />
        );
      case 'PROMO_ASSIGNED':
        return (
          <PromoPost
            key={`feed-${item._id}`}
            post={item}
            onTap={() => navigation.push(PROMO, { promo: item.meta.promo })}
          />
        );
      default:
        const { targetUrl, openScreen, screenData } = (item.meta || {});
        return (
          <Post
            navigation={navigation}
            post={item}
            touchable={!!(targetUrl || openScreen)}
            onTap={() => {
              if (openScreen) {
                navigation.push(openScreen, screenData);
              }

              if (targetUrl) {
                Linking.canOpenURL(targetUrl)
                  .then((supported) => {
                    if (supported) {
                      Linking.openURL(targetUrl);
                    } else {
                      genericAlert(`Don't know how to open URI: ${targetUrl}`);
                    }
                  });
              }
            }}
          />
        );
    }
  };

  // onViewableItemsChanged = ({ viewableItems }) => {
  //   console.log(viewableItems);
  // };

  renderPosts = () => {
    const {
      posts, loading, loadingPage, navigation, isCommunity, communityOptIn,
    } = this.props;

    if (isCommunity && !communityOptIn) {
      return null;
    }

    const loadingSkeletons = (
      <Virtual>
        <SimplePostLoadingSkeleton />
        <PostLoadingSkeleton />
      </Virtual>
    );

    const postList = posts || [];
    const postFlatList = (
      <FlatList
        keyExtractor={(post) => post._id}
        data={postList}
        renderItem={({ item }) => this.renderPost(item)}

        initialNumToRender={1}
        maxToRenderPerBatch={1}
      />
    );

    let initialPosts = [];

    if (!isCommunity) {
      const eloiseUserId = '5b9c420a9addc94ece551262';
      const eloiseUserName = 'afFlux';

      initialPosts = [
        {
          header: 'Build A Scene',
          userName: '-NoGrey-',
          image: require('../../../assets/Build-Scene.jpg'),
          description: 'Experince what makes NoGrey unique. We\'ve visualised pre-scene negotiations so that you can communicate with ease and arrive at the fun part of the scene confidently.',
          onImagePress: () => navigation.push(ADD),
          onPress: () => navigation.push(COMMUNITY_GUIDELINES),
        },
        {
          userId: eloiseUserId,
          header: 'Welcome To Our Domain',
          userName: eloiseUserName,
          image: require('../../../assets/WelcomeToned.png'),
          description: 'It is an honour to present this offering to the community. \nNoGrey is born out of my personal experience in negotiation, with 1,000+ scenes in both a professional capacity, and in my personal play. I sincerely hope that this experience, and the experience of all the talented NoGrey team, can help you streamline pre-scene discussion and restore fun to your kink. Please don\'t hesitate to connect with me and say \'hi\'! \nFinally, I hope you have fun playing both with the app, and with your partners! It\'s all for you. xox',
          onPress: () => this.goToWeb('http://nogrey.app/version1'),
          onProfilePress: () => this.navigateToProfile(eloiseUserName, eloiseUserId),
        },
        // {
        //   header: 'Help Us Shape NoGrey',
        //   userName: '-NoGrey-',
        //   image: require('../../../assets/NG_Welcome.png'),
        //   description: 'You\'ve gained early access to a beta version, if you would like to know what features are still to be released you can find out more at our website - nogrey.app',
        //   onImagePress: () => this.goToWeb('http://nogrey.app/version1'),
        // },
        {
          header: 'Build A Scene',
          userName: '-NoGrey-',
          image: 'https://s3.us-east-2.amazonaws.com/resource.nogrey.app/Build-Scene.jpeg',
          description: 'Experince what makes NoGrey unique. We\'ve visualised pre-scene negotiations so that you can communicate with ease and arrive at the fun part of the scene confidenty.',
          onImagePress: () => navigation.push(ADD),
        },
        {
          header: 'Add your interests',
          userName: '-NoGrey-',
          image: require('../../../assets/SunBurst.jpeg'),
          description:
            'Click on the image above now or use the \'Add Interest\' button in the main menu on your profile view at any time!' +
            '\n' +
            '\n' +
            'The best part... your interest can be built out over time by adding them when you create or accept scenes.  Enjoy!',
          onImagePress: () => navigation.push(INTERESTS_AND_ACTIVITIES),
        },
        {
          header: 'Maintaining Standards',
          userName: '-NoGrey-',
          image: require('../../../assets/FounderIntro.png'),
          description: 'We like naughty, we like nasty, we especially like those who misbehave, but make no mistake... it is NEVER ok to be a bully. If you wish to be part of the NoGrey community, know that we will not tolerate harassment in any form, and be clear that posting obscene/illegal images simply cannot be allowed. Click here to learn more about our community guidelines.',
          onImagePress: () => navigation.push(COMMUNITY_GUIDELINES),
          onPress: () => navigation.push(COMMUNITY_GUIDELINES),
        },
      ];
    }

    const initialPostsElements = initialPosts.map((initialPost) => (
      <InitialPost
        key={initialPost.description}
        logoSize={40}
        header={initialPost.header}
        userId={initialPost.userId}
        userName={initialPost.userName}
        image={initialPost.image}
        description={initialPost.description}
        onImagePress={initialPost.onImagePress}
        onProfilePress={initialPost.onProfilePress}
      />
    ));

    return (
      <View>
        {loading && loadingSkeletons}
        {!loading && postFlatList}
        {!loading && postList.length < 10 && initialPostsElements}
        {loadingPage && <ActivityIndicator size='large' color={THIRD_COLOR} />}
      </View>
    );
  };

  renderCommunityMessage = () => {
    const {
      isCommunity, posts, communityOptIn, onSetCommunityOptIn,
    } = this.props;
    const postList = posts || [];
    const noCommunityPostsMessage = (
      <View style={styles.noCommunityPostsContainer}>
        <Text style={styles.noCommunityPostsMessage}>
          Here you will see posts from the community
        </Text>
      </View>
    );

    const optInMessage = (
      <View style={styles.communityOptInContainer}>
        <Text style={styles.communityOptInTitle}>
          Welcome!
        </Text>
        <View style={styles.communityOptInParagraph}>
          <Text style={styles.communityOptInText}>The NoGrey community feed allows users to broadcast their thoughts and images to all NoGrey users.</Text>
        </View>
        <View style={styles.communityOptInParagraph}>
          <Text style={styles.communityOptInText}>{'You\'re able to:'}</Text>
          <Text style={styles.communityOptInText}>{'- \'Hide\' individual posts'}</Text>
          <Text style={styles.communityOptInText}>{'- \'Mute\' a particular user'}</Text>
          <Text style={styles.communityOptInText}>- Adjust viewable content to NSFW</Text>
        </View>
        <TouchableOpacity
          style={styles.communityOptInButton}
          onPress={() => onSetCommunityOptIn(true)}
        >
          <Text style={styles.communityOptInButtonText}>Yes, give it to me!</Text>
        </TouchableOpacity>
        <Text style={styles.communityOptInWarningMessage}>
          {'To avoid a ban, please don\'t post graphic images of your bits to the community feed where there are people you haven\'t gained consent from.'}
        </Text>
      </View>
    );

    if (isCommunity && !communityOptIn) {
      return optInMessage;
    }

    if (isCommunity && postList.length === 0) {
      return noCommunityPostsMessage;
    }

    return null;
  };

  deleteCard = () => {
    this.cardSlider.deleteCard();
  };

  renderTutorialCards = () => {
    const {
      navigation, setAddWelcomeCardWatch, welcomeCardsWatch, onTogglePinRequired, pinRequired, isCommunity,
    } = this.props;

    if (isCommunity) {
      return null;
    }

    const PadBlockIcon = () => {
      return <NoGreyFont name='pad-block' size={60} color={NAVIGATION_ACTIVE_ICON_COLOR} />;
    };

    const PIN_CARD = 'pinCard';
    const pinCard = (
      <Card
        key={PIN_CARD}
        title='Protect My Account'
        text='Help me set up a PIN to restrict access.'
        Component={PadBlockIcon}

        action={() => {
          navigation.push(PIN, { text: 'Setup your security PIN' });
          onTogglePinRequired(true);
          setAddWelcomeCardWatch([...welcomeCardsWatch, PIN_CARD]);
        }}
        onCrossClick={() => {
          setAddWelcomeCardWatch([...welcomeCardsWatch, PIN_CARD]);
          this.deleteCard();
        }}
      />
    );

    const ChatIcon = () => {
      return <NoGreyFont name='chat' size={60} color={NAVIGATION_ACTIVE_ICON_COLOR} />;
    };

    const EXPIRED_MESSAGES_CARD = 'expiredMessagesCard';
    const expiredMessagesCard = (
      <Card
        key={EXPIRED_MESSAGES_CARD}
        title='Enjoy Secure Chat'
        text='Your messages expire after 48hrs.'
        Component={ChatIcon}
        onCrossClick={() => {
          setAddWelcomeCardWatch([...welcomeCardsWatch, EXPIRED_MESSAGES_CARD]);
          this.deleteCard();
        }}
      />
    );

    const NoGreyIcon = () => {
      return <NoGreyFont name='nogrey' color={NAVIGATION_ACTIVE_ICON_COLOR} size={60} />;
    };

    const CONFIGURE_YOUR_INTERESTS = 'configureYourInterestsCard';
    const configureYourInterestsCard = (
      <Card
        key={CONFIGURE_YOUR_INTERESTS}
        title='Configure your interests'
        text='Select the areas of kink that interest you.'
        Component={NoGreyIcon}
        action={() => {
          navigation.push(INTERESTS_AND_ACTIVITIES);
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_YOUR_INTERESTS]);
        }}
        onCrossClick={() => {
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_YOUR_INTERESTS]);
          this.deleteCard();
        }}
      />
    );

    const EnvelopeIcon = () => {
      return <NoGreyFont name='envelope' color={NAVIGATION_ACTIVE_ICON_COLOR} size={60} />;
    };

    const CONFIGURE_YOUR_EMAIL = 'configureYourEmail';
    const configureYourEmailCard = (
      <Card
        key={CONFIGURE_YOUR_EMAIL}
        title='Configure your email'
        text='Select your email to recover your account.'
        Component={EnvelopeIcon}
        action={() => {
          navigation.push(SET_EMAIL_SCREEN);
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_YOUR_EMAIL]);
        }}
        onCrossClick={() => {
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_YOUR_EMAIL]);
          this.deleteCard();
        }}
      />
    );

    const NotificationsIcon = () => {
      return <NoGreyFont name='bell' size={60} color={NAVIGATION_ACTIVE_ICON_COLOR} />;
    };

    const CONFIGURE_YOUR_NOTIFICATIONS = 'configureYourNotifications';
    const configureYourNotificationsCard = (
      <Card
        key={CONFIGURE_YOUR_NOTIFICATIONS}
        title='Configure your notifications'
        text='Select your notifications settings.'
        Component={NotificationsIcon}
        action={() => {
          navigation.push(REGISTRATION_4);
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_YOUR_NOTIFICATIONS]);
        }}
        onCrossClick={() => {
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_YOUR_NOTIFICATIONS]);
          this.deleteCard();
        }}
      />
    );

    const NSFWCard = () => {
      return <NoGreyFont name='nsfw_signal' size={60} color={NAVIGATION_ACTIVE_ICON_COLOR} />;
    };

    const CONFIGURE_NSFW = 'configureNSFW';
    const configureNSFWCard = (
      <Card
        key={CONFIGURE_NSFW}
        title='Prefer to be NAUGHTY'
        text='Disable the NSFW filter here.'
        Component={NSFWCard}
        action={() => {
          navigation.push(SETTINGS);
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_NSFW]);
        }}
        onCrossClick={() => {
          setAddWelcomeCardWatch([...welcomeCardsWatch, CONFIGURE_NSFW]);
          this.deleteCard();
        }}
      />
    );

    const cards = [];
    const wasPinCardClose = welcomeCardsWatch.some((cardId) => cardId === PIN_CARD);
    if (!wasPinCardClose && !pinRequired) cards.push(pinCard);

    const wasExpiredMessagesCardWatch = welcomeCardsWatch.some((cardId) => cardId === EXPIRED_MESSAGES_CARD);
    if (!wasExpiredMessagesCardWatch) cards.push(expiredMessagesCard);

    const wasExpiredConfigureYourInterestsWatch = welcomeCardsWatch.some((cardId) => cardId === CONFIGURE_YOUR_INTERESTS);
    if (!wasExpiredConfigureYourInterestsWatch) cards.push(configureYourInterestsCard);

    const wasConfigureYourEmailCardWatch = welcomeCardsWatch.some((cardId) => cardId === CONFIGURE_YOUR_EMAIL);
    if (!wasConfigureYourEmailCardWatch) cards.push(configureYourEmailCard);

    const wasNSFWWatch = welcomeCardsWatch.some((cardId) => cardId === CONFIGURE_NSFW);
    if (!wasNSFWWatch) cards.push(configureNSFWCard);

    const wasConfigureYourNotificationsCardWatch = welcomeCardsWatch.some((cardId) => cardId === CONFIGURE_YOUR_NOTIFICATIONS);
    if (false && !wasConfigureYourNotificationsCardWatch) cards.push(configureYourNotificationsCard);

    if (!cards.length || isCommunity) {
      return;
    }

    return (
      <View style={styles.cardSliderContainer}>
        <CardSilder
          ref={(ref) => {
            this.cardSlider = ref;
          }}
          autoplay
          interval={5000}
        >
          {cards}
        </CardSilder>
      </View>
    );
  };

  renderMyAvatar = () => {
    const { token } = this.props;

    if (!token) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={() => this.navigateToMyProfile(token.userName, token._id)}
      >
        <MyAvatar size={40} />
      </TouchableOpacity>
    );
  };

  renderCreateInput = () => {
    const { navigation } = this.props;

    return (
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.input}
          onPress={() => navigation.push(SHARE_THOUGHTS)}
        >
          <Text>Share your thoughts...</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => this.modal && this.modal.toggleModalVisible()}
          style={styles.cameraAndSendIcons}
        >
          <Icon name='md-camera' size={30} color={HEADER_MENU_COLOR} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cameraAndSendIcons}
          onPress={() => navigation.push(SHARE_THOUGHTS)}
        >
          <Icon name='ios-send' size={30} color={HEADER_MENU_COLOR} />
        </TouchableOpacity>
      </View>
    );
  };

  handleScroll = (event) => {
    const { currentOldPostsPage } = this.state;

    if (event.nativeEvent.contentOffset.y / event.nativeEvent.contentSize.height >= limitScrollHeightToGetOthers(currentOldPostsPage)) {
      this.getPosts();
    }
  };

  getPosts = () => {
    // this.getNewPosts();
    this.getOldPosts();
  };

  getNewPosts = () => {
    const { onGetNextNewPosts, currentNewPostsCount } = this.props;
    const { getPostsInitialTime } = this.state;

    onGetNextNewPosts(currentNewPostsCount, PAGE_SIZE, getPostsInitialTime);
  };

  getOldPosts = () => {
    const { getPostsInitialTime, currentOldPostsPage } = this.state;
    const { onGetNextPageOldPosts } = this.props;

    this.setState({ currentOldPostsPage: currentOldPostsPage + 1 }, () => {
      onGetNextPageOldPosts(currentOldPostsPage, PAGE_SIZE, getPostsInitialTime);
    });
  };

  renderShareThoughts = () => {
    const { isCommunity } = this.props;

    if (isCommunity) {
      return null;
    }

    return (
      <View style={styles.formContainer}>
        {this.renderMyAvatar()}
        {this.renderCreateInput()}
      </View>
    );
  };

  render() {
    const {
      isNotSupported, navigation, showLoadingPost, showLoadingSimplePost,
    } = this.props;

    if (isNotSupported) {
      navigation.replace(UPDATE_REQUIRED);
    }

    return (
      <ScrollView
        ref={(ref) => {
          this.scroll = ref;
        }}
        style={styles.container}
        keyboardShouldPersistTaps='handled'
        onScroll={(event) => this.handleScroll(event)}
        scrollEventThrottle={2000}
      >
        {this.renderTutorialCards()}
        {this.renderShareThoughts()}
        {this.renderModal()}

        {showLoadingPost ? <PostLoadingSkeleton /> : null}
        {showLoadingSimplePost ? <SimplePostLoadingSkeleton /> : null}

        {this.renderPosts()}
        {this.renderCommunityMessage()}

      </ScrollView>
    );
  }
}

Feed.propTypes = {
  welcomeCardsWatch: PropTypes.arrayOf(Array),
  likedPosts: PropTypes.arrayOf(Array),
  posts: PropTypes.arrayOf(Array),
  currentNewPostsCount: PropTypes.number,
  onGetNextPageOldPosts: PropTypes.func,
  onGetNextNewPosts: PropTypes.func,
  token: PropTypes.objectOf(Object),
  pin: PropTypes.string,
  inviteCode: PropTypes.string,
  profile: PropTypes.objectOf(Object),
  selectedProfile: PropTypes.objectOf(Object),
  navigation: PropTypes.objectOf(Object),
  wasRunDeeplink: PropTypes.bool,
  onRunDeeplink: PropTypes.func,
  sceneInvite: PropTypes.objectOf(Object),
  onGetProfile: PropTypes.func,
  onFindUser: PropTypes.func,
  onDispatch: PropTypes.func,
  storePhoneToken: PropTypes.func,
  onLikePost: PropTypes.func,
  setAddWelcomeCardWatch: PropTypes.func,
  onSetCommunityOptIn: PropTypes.func,
  onTogglePinRequired: PropTypes.func,
  onBuyGift: PropTypes.func,
  onReadAll: PropTypes.func,
  loading: PropTypes.bool,
  loadingPage: PropTypes.bool,
  showLoadingPost: PropTypes.bool,
  showLoadingSimplePost: PropTypes.bool,
  pinRequired: PropTypes.bool,

  isNotSupported: PropTypes.bool,
  isCommunity: PropTypes.bool,
  communityOptIn: PropTypes.bool,
};

export default Feed;
