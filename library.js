'use strict';

const partner = require('./lib/partner');

const Plugin = module.exports;

function localEnsureLoggedIn(req, res, next) {
  const uid = Number(req.uid || (req.user && req.user.uid) || 0);
  if (uid > 0) return next();
  return res.status(401).json({ error: 'login_required', message: '请先登录' });
}

Plugin.init = async function init(params) {
  const router = params.router || params.app;
  const middleware = params.middleware || {};

  if (!router) {
    throw new Error('[peipe-partner-api] Missing NodeBB router/app in static:app.load hook');
  }

  const ensureLoggedIn = middleware.ensureLoggedIn || localEnsureLoggedIn;

  // Unique Peipe routes, to avoid conflict with an existing language partner plugin.
  //   GET /api/peipe-partners?mode=recommend
  //   GET /api/peipe-partners?mode=nearby
  router.get('/api/peipe-partners', partner.list);

  // Profile completion used by the auto popup after registration/login.
  router.get('/api/peipe-partners/me/profile-status', ensureLoggedIn, partner.profileStatus);
  router.put('/api/peipe-partners/me/profile', ensureLoggedIn, partner.updateProfile);
  router.post('/api/peipe-partners/me/profile', ensureLoggedIn, partner.updateProfile);

  // Location endpoint used by /nearby.
  router.put('/api/peipe-partners/location', ensureLoggedIn, partner.updateLocation);
  router.post('/api/peipe-partners/location', ensureLoggedIn, partner.updateLocation);

  partner.startScheduler();
};

Plugin.teardown = async function teardown() {
  partner.stopScheduler();
};
