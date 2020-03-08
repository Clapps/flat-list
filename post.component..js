import React, { Component } from 'react';
import { Text, View, Alert } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import PropTypes from 'prop-types';

import Avatar from '../UI/Avatar/Avatar.component';
import { GREY, SECONDARY_COLOR } from '../../constants/style.constants';

import {
  COMMENTS_ASYNC,
  EXTERNAL_PROFILE,
  IMAGE_POST_EDIT,
  LIKES_ASYNC,
  PROFILE, REPORT_POST,
  SHARE_THOUGHTS_EDIT,
} from '../../constants/screen.constants';

import styles from './Post.styles';
import TimeSpent from '../TimeSent.component';
import NoGreyFont from '../../Icons/NoGrey/icons';
import Image from '../UI/Image.component';
import ActionsDropdown from '../Dropdown/ActionsDropdown.component';
import { genericConfirm } from '../../utils/showGenericAlert';
import { isLiked } from '../../utils/feed.utils';
import TouchableOpacity from '../UI/TouchableOpacity/TouchableOpacity.component';
import MyAvatar from '../UI/Avatar/MyAvatar/MyAvatar.container';
import { HIT_SLOP } from '../../constants/app.constants';

class Post extends Component {
  renderMenuModal = () => {
    const {
      post, navigation, token, onDeletePost, onHidePost, onBlockUser, onMarkAsNSFW, onDeletePostLocally,
    } = this.props;

    const editHandler = post.imageUrl ? IMAGE_POST_EDIT : SHARE_THOUGHTS_EDIT;

    const editItem = {
      name: 'Edit',
      handler: (closeMenu) => {
        closeMenu();
        navigation.push(
          editHandler,
          {
            post,
            image: post,
            imageUri: post.imageUrl && { uri: post.imageUrl },
          },
        );
      },
    };

    const deleteItem = {
      name: 'Delete',
      handler: (closeMenu) => {
        genericConfirm('Delete post', 'Are you sure?', () => {
          onDeletePost();
          closeMenu();
        }, () => closeMenu());
      },
    };

    const reportItem = {
      name: 'Flag for review',
      handler: (closeMenu) => {
        closeMenu();
        navigation.push(REPORT_POST, {
          data: {
            postId: post._id,
            userId: post.owner._id,
          },
        });
      },
    };

    const markAsNSFWItem = {
      name: 'Flag as NSFW',
      handler: (closeMenu) => {
        onMarkAsNSFW();
        Alert.alert('Thank you for your report', 'Remember you can hide content if you find it offensive or sensitive.', [
          {
            text: 'Ok',
            onPress: () => {
              closeMenu();
              if (token.nsfw) {
                onDeletePostLocally();
              }
            },
          },
        ]);
      },
    };

    const hideItem = {
      name: 'Hide post',
      handler: (closeMenu) => {
        Alert.alert('Hide post', 'This post is not going to be visible for you anywhere', [
          {
            text: 'Hide',
            onPress: () => {
              closeMenu();
              onHidePost();
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              closeMenu();
            },
          },
        ]);
      },
    };

    const blockUser = {
      name: 'Block user',
      handler: (closeMenu) => {
        Alert.alert('Block user', 'This user is not going to be able to see you anywhere', [
          {
            text: 'Block',
            onPress: () => {
              closeMenu();
              onBlockUser();
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              closeMenu();
            },
          },
        ]);
      },
    };

    const tokenSerialized = token || {};
    post.owner = post.owner || {};

    const isMine = tokenSerialized._id === post.owner._id;
    const myPostMenu = [editItem, deleteItem];
    const otherPostMenu = [reportItem, hideItem, markAsNSFWItem, blockUser];

    return (
      <ActionsDropdown actions={isMine ? myPostMenu : otherPostMenu} />
    );
  };

  handleLove = () => {
    const { onLikePost } = this.props;
    onLikePost();
  };

  handleComments = () => {
    const { post, navigation } = this.props;
    navigation.push(COMMENTS_ASYNC, { postId: post._id });
  };

  render() {
    const {
      token, onTap, navigation, onFindUser, post, touchable,
    } = this.props;

    const {
      owner, createdOn, description, likes, commentsCount, imageUrl, imagePreviewUrl, meta,
    } = post;

    const { userName, profile, _id } = owner;
    const { title } = meta || {};

    const isMine = token && _id === token._id;

    const navigateToProfile = () => {
      if (isMine) {
        navigation.push(PROFILE);
      } else {
        onFindUser(userName);
        navigation.push(EXTERNAL_PROFILE, { userId: _id });
      }
    };

    const photo = isMine ? token.photo : profile.photo;

    let avatar = <Avatar customStyle={styles.avatar} userImage={photo} size={40} />;
    if (isMine) {
      avatar = <MyAvatar size={40} />;
    }

    return (
      <TouchableOpacity onPress={touchable && onTap} style={styles.postContainer}>
        <View style={styles.postHeaderContainer}>

          <TouchableOpacity style={styles.avatarContainer} onPress={navigateToProfile}>
            {avatar}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cardUsernameContainer} onPress={navigateToProfile}>
            <Text style={styles.cardUsername}>{title || userName}</Text>
            <TimeSpent createdOn={createdOn} />
          </TouchableOpacity>

          {this.renderMenuModal()}
        </View>

        {imageUrl ?
          <Image
            preview={imagePreviewUrl}
            url={imageUrl}
            sameRatio
          /> : null
        }

        {description ?
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{description}</Text>
          </View> : null}

        <View style={styles.loveAndCommentContainer}>

          <View style={styles.loveAndComment}>

            <TouchableOpacity onPress={this.handleLove} hitSlop={HIT_SLOP}>
              {isLiked(post, token && token._id) ?
                <NoGreyFont name='boost-raised' color={SECONDARY_COLOR} size={25} /> :
                <NoGreyFont name='boost' color={SECONDARY_COLOR} size={25} />
              }
            </TouchableOpacity>

            <Text style={styles.loveAndCommentText} onPress={() => navigation.push(LIKES_ASYNC, { postId: post._id })}>
              {likes.length}
            </Text>
          </View>

          <View style={[styles.loveAndComment, { marginLeft: 20 }]}>
            <TouchableOpacity onPress={this.handleComments} hitSlop={HIT_SLOP}>
              <Icon name='ios-text' size={30} color={GREY} />
            </TouchableOpacity>
            <TouchableOpacity onPress={this.handleComments} hitSlop={HIT_SLOP}>
              <Text style={styles.loveAndCommentText}>{commentsCount}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </TouchableOpacity>
    );
  }
}

Post.propTypes = {
  post: PropTypes.objectOf(Object),
  touchable: PropTypes.bool,
  token: PropTypes.objectOf(Object),
  navigation: PropTypes.objectOf(Object),
  onTap: PropTypes.func.isRequired, // SI NO LE PASAS onTap NO RE-RENDEREA, NO ENTIENDO PORQUE....
  onFindUser: PropTypes.func,
  onDeletePostLocally: PropTypes.func,
  onDeletePost: PropTypes.func,
  onHidePost: PropTypes.func,
  onMarkAsNSFW: PropTypes.func,
  onBlockUser: PropTypes.func,
  onLikePost: PropTypes.func,
};

export default Post;
