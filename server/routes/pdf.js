'use strict';

/**
 * 교재 원본 PDF. 로그인이 필요하다.
 *
 * 파일은 private/ 에 있고 정적 루트(public/) 밖이므로 직접 경로로는 접근할 수 없다.
 * res.sendFile 이 Range 요청을 처리하므로 브라우저 PDF 뷰어의 페이지 이동이 정상 동작한다.
 */

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { asyncHandler, notFound } = require('../lib/errors');

const router = express.Router();
const PRIVATE_DIR = path.resolve(__dirname, '..', '..', 'private');

let resolvedFile = null;

/** private/ 안의 첫 번째 PDF 를 사용한다. 파일명이 바뀌어도 동작하도록. */
function findPdf() {
  if (resolvedFile && fs.existsSync(resolvedFile)) return resolvedFile;
  if (!fs.existsSync(PRIVATE_DIR)) return null;

  const match = fs
    .readdirSync(PRIVATE_DIR)
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .sort()[0];

  resolvedFile = match ? path.join(PRIVATE_DIR, match) : null;
  return resolvedFile;
}

/** 비ASCII 파일명은 RFC 5987 형식으로도 함께 보낸다. */
function contentDisposition(fileName, { download }) {
  const type = download ? 'attachment' : 'inline';
  const asciiFallback = 'certain-textbook.pdf';
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const file = findPdf();
    if (!file) {
      throw notFound('PDF_NOT_FOUND', '교재 PDF 파일을 찾을 수 없습니다.');
    }

    const download = req.query.download === '1';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', contentDisposition(path.basename(file), { download }));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.sendFile(file, { acceptRanges: true, dotfiles: 'deny' });
  })
);

module.exports = router;
