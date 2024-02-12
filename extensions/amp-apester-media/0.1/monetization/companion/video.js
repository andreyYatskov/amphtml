import {createElementWithAttributes} from '#core/dom';
import {getValueForExpr} from '#core/types/object';

import {Services} from '#service';

import {
  constructStaticAniviewAd,
  getCompanionVideoAdSize,
} from '../ads-constructor';

/**
 * @param {!JsonObject} media
 * @param {!AmpElement} apesterElement
 * @param {!JsonObject} consentObj
 */
export function handleCompanionVideo(media, apesterElement, consentObj) {
  const companionCampaignOptions = getValueForExpr(
    /**@type {!JsonObject}*/ (media),
    'campaignData.companionCampaignOptions'
  );
  const videoSettings = getValueForExpr(
    /**@type {!JsonObject}*/ (media),
    'campaignData.companionOptions.video'
  );
  const position = getCompanionPosition(
    /**@type {!JsonObject}*/ (videoSettings)
  );
  if (
    !videoSettings ||
    !videoSettings.enabled ||
    !position ||
    position === 'floating'
  ) {
    return;
  }
  const provider = videoSettings['provider'];
  switch (provider) {
    case 'sr': {
      const companionCampaignId = companionCampaignOptions?.companionCampaignId;
      const {videoTag} = videoSettings;

      if (!companionCampaignId || !videoTag) {
        return;
      }
      const macros = getSrMacros(
        media,
        companionCampaignId,
        apesterElement,
        consentObj
      );
      addCompanionSrElement(
        videoTag,
        position,
        /** @type {!JsonObject} */ (macros),
        apesterElement
      );
      break;
    }
    case 'aniview': {
      const {playerOptions = {}} = videoSettings;
      if (!playerOptions.aniviewPlayerId) {
        return;
      }
      constructStaticAniviewAd(
        apesterElement,
        playerOptions.aniviewPlayerId,
        consentObj,
        position === 'above'
      );
      break;
    }
    default:
      break;
  }
}

/**
 * @param {!JsonObject} video
 * @return {?string}
 */
function getCompanionPosition(video) {
  if (!video) {
    return null;
  }
  if (video['companion']['enabled']) {
    return 'above';
  }
  if (video['companion_below']['enabled']) {
    return 'below';
  }
  if (video['floating']['enabled']) {
    return 'floating';
  }
  return null;
}

/**
 * @param {string} videoTag
 * @param {string} position
 * @param {!JsonObject} macros
 * @param {!AmpElement} apesterElement
 */
function addCompanionSrElement(videoTag, position, macros, apesterElement) {
  const size = getCompanionVideoAdSize(apesterElement);
  const refreshInterval = 30;
  const ampBladeAd = createElementWithAttributes(
    /** @type {!Document} */ (apesterElement.ownerDocument),
    'amp-ad',
    {
      'width': size.width,
      'height': size.height,
      'type': 'blade',
      'layout': 'fixed',
      'data-blade_player_type': 'bladex',
      'servingDomain': 'ssr.streamrail.net',
      'data-blade_macros': JSON.stringify(macros),
      'data-blade_player_id': videoTag,
      'data-blade_api_key': '5857d2ee263dc90002000001',
      'data-enable-refresh': `${refreshInterval}`,
    }
  );

  ampBladeAd.classList.add('i-amphtml-amp-apester-companion');

  const relativeElement =
    position === 'below' ? apesterElement.nextSibling : apesterElement;
  apesterElement.parentNode.insertBefore(ampBladeAd, relativeElement);

  Services.mutatorForDoc(apesterElement).requestChangeSize(
    ampBladeAd,
    size.height
  );
}

/**
 * @param {!JsonObject} interactionModel
 * @param {?string} campaignId
 * @param {!AmpElement} apesterElement
 * @param {!JsonObject} consentObj
 * @return {!JsonObject}
 */
function getSrMacros(interactionModel, campaignId, apesterElement, consentObj) {
  const interactionId = interactionModel['interactionId'];
  const publisherId = interactionModel['publisherId'];
  const publisher = interactionModel['publisher'];

  const pageUrl = Services.documentInfoForDoc(apesterElement).canonicalUrl;

  const macros = {
    'param1': interactionId,
    'param2': publisherId,
    'param6': campaignId,
    'page_url': pageUrl,
  };

  if (consentObj['gdpr']) {
    macros['gdpr'] = consentObj['gdpr'];
    macros['user_consent'] = consentObj['user_consent'];
    macros['param4'] = consentObj['gdprString'];
  }

  if (publisher && publisher.groupId) {
    macros['param7'] = `apester.com:${publisher.groupId}`;
    macros['schain'] = `1.0,1!apester.com,${publisher.groupId},1,,,,`;
  }
  return macros;
}
