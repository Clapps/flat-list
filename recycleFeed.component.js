import React from 'react';
import { Linking, FlatList } from 'react-native';
import PropTypes from 'prop-types';

import PromoPost from '../../../../components/Post/PromoPost.component';
import { noop } from '../../../../utils/helpers';
import { PROMO, SUBSCRIPTIONS_AND_PROMOS_SCREEN } from '../../../../constants/screen.constants';
import Post from '../../../../components/Post/Post.container';
import genericAlert from '../../../../utils/showGenericAlert';

export default class RecycleTestComponent extends React.Component {
  // Given type and data return the view component
  _renderPost = (item) => {
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

  render() {
    const { posts } = this.props;
    return (
      <FlatList
        keyExtractor={(post) => post._id}
        data={posts}
        renderItem={({ item }) => this._renderPost(item)}

        initialNumToRender={1}
        maxToRenderPerBatch={1}
      />
    );
  }
}

RecycleTestComponent.propTypes = {
  posts: PropTypes.arrayOf(Array),
  navigation: PropTypes.objectOf(Object),
};
