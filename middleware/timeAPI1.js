//rate check 2 mins

const checkRateLimit = (customerName) => {
    const limitCount = 1; 
    const limitTime = 2 * 60 * 1000; 
    const now = moment();
    if (!rateLimiters[customerName]) {
      rateLimiters[customerName] = {
        count: 1,
        lastRequest: now,
      };
      setTimeout(() => {
        delete rateLimiters[customerName];
      }, limitTime);
      return true;
    } else {
      rateLimiters[customerName].count++;
      const timeDiff = now.diff(rateLimiters[customerName].lastRequest);
      if (rateLimiters[customerName].count > limitCount || timeDiff < limitTime) {
        throw {
          message: 'Maximum limit reached'
        };
      } else {
        rateLimiters[customerName] = {
          count: 1,
          lastRequest: now,
        };
        setTimeout(() => {
          delete rateLimiters[customerName];
        }, limitTime);
        return true;
      }
    }
  };

  module.exports = checkRateLimit;