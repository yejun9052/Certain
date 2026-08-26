'use strict';

/**
 * 학습 콘텐츠 라우트. 로그인이 필요하다.
 *
 * 문제·단원 데이터는 정적 셸(app.js)에서 분리되어 여기서만 제공된다.
 * 비로그인 상태에서는 파일을 내려받아도 문제 데이터를 얻을 수 없다.
 */

const express = require('express');
const crypto = require('node:crypto');
const content = require('../lib/content');
const { sendOk, asyncHandler } = require('../lib/errors');

const router = express.Router();

let cachedPayload = null;
let cachedEtag = null;

function payload() {
  if (!cachedPayload) {
    cachedPayload = content.getPublicContent();
    cachedEtag = `"${crypto
      .createHash('sha256')
      .update(JSON.stringify(cachedPayload))
      .digest('hex')
      .slice(0, 32)}"`;
  }
  return cachedPayload;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = payload();

    // 사용자별로 다르지 않지만, 인증 뒤의 자원이므로 공유 캐시에 저장되면 안 된다.
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('ETag', cachedEtag);

    if (req.headers['if-none-match'] === cachedEtag) {
      res.status(304).end();
      return;
    }

    sendOk(res, data);
  })
);

module.exports = router;
