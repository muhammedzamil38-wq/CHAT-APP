import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { userRepository } from '../repositories/userRepository.js';

export const configurePassport = () => {
  if (!env.googleClientId || !env.googleClientSecret) {
    console.warn('[MISSION-CONTROL][AUTH] Google OAuth credentials missing. Strategy not initialized.');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: env.googleClientId,
    clientSecret: env.googleClientSecret,
    callbackURL: env.googleCallbackUrl,
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      const username = profile.displayName;
      const avatarUrl = profile.photos[0]?.value;

      // 1. Check if user exists by google_id
      let user = await userRepository.findByGoogleId(googleId);
      
      if (user) {
        return done(null, user);
      }

      // 2. Check if user exists by email (link accounts)
      user = await userRepository.findByEmail(email);
      if (user) {
        const updatedUser = await userRepository.linkGoogleId(user.id, googleId, avatarUrl);
        return done(null, updatedUser);
      }

      // 3. Create new user
      const newUser = await userRepository.create(email, null, username, 'user', googleId, avatarUrl);
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }));

  // We don't use passport sessions (using JWT cookies instead)
  // But passport might require these if we use certain methods
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userRepository.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
