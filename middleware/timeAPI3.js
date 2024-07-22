//time-based api
const checkTimeRestriction = () => {
    const now = moment();
    const dayOfWeek = now.day(); 
    const hourOfDay = now.hour();
  
    if (dayOfWeek === 1) { 
      throw {
        message: 'Please don’t use this API on Monday'
      };
    } else if (hourOfDay >= 8 && hourOfDay < 15) { 
      throw {
        message: 'Please try after 3pm'
      };
    }
  
    return true;
  };

