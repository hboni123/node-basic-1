//5 min call limit

function canMakeApiCall() {
    const now = Date.now();
    
    callHistory = callHistory.filter(timestamp => now - timestamp <= 300000);
    
    if (callHistory.length < 2) {
        callHistory.push(now);
        return true;
    }
    
    const oldestCall = callHistory[0];
    if (now - oldestCall > 300000) {
        callHistory.shift();
        callHistory.push(now);
        return true;
    }
    
    throw {
      message: 'Only 2 hits allowed per 5 min'
    };
}

module.exports = canMakeApiCall;