const https = require('https');

const STATUS_GIF = {
  started: 'https://media.giphy.com/media/tXLpxypfSXvUc/giphy.gif', // rocket launching
  succeeded: 'https://media.giphy.com/media/MYDMiSizWs5sjJRHFA/giphy.gif', // micheal jordan celebrating
  failed: 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif', // anthony anderson crying
  canceled: 'https://media.giphy.com/media/IzXmRTmKd0if6/giphy.gif', // finger pressing abort button
}

// Get project issues from Snyk
let getSnykApiRequestDetails = () => {
  const data = JSON.stringify({
      "filters": {
        "severities": [
          "high",
          "medium",
          "low"
        ],
        "exploitMaturity": [
          "mature",
          "proof-of-concept",
          "no-known-exploit",
          "no-data"
        ],
        "types": [
          "vuln",
          "license"
        ],
        "ignored": false,
        "patched": false
      }
  })

  const options = {
    hostname: 'snyk.io',
    port: 443,
    path: `/api/v1/org/${process.env.SNYK_ORGANIZATION_ID}/project/${process.env.SNYK_PROJECT_ID}/issues`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization' : `token ${process.env.SNYK_AUTH_TOKEN}`
    }
  }

  return {
    data, 
    options
  }
}

// Pipeline status message
let getPipelineStatusMessage = (state, pipeline, gif = '') => {
  return `The pipeline ${pipeline} has *${state}*.\n${gif}`
}

// Post slack notification
let slackApiRequestDetails = (messageNotification) => {
  const text = typeof messageNotification === 'string' ? messageNotification : JSON.stringify(messageNotification)
  const data = JSON.stringify({
    text
  })
    
  const options = {
    hostname: 'hooks.slack.com',
    port: 443,
    path: `/services/${process.env.SLACK_WEBHOOK_TOKEN}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }
  
  return {
    data, 
    options
  }
}


let apiRequest = (data, options) => {
  try {

    return new Promise(resolve => {
      let obj='';
      callback = function(response){
          let res='';
  
          response.on('data',function(chunk){
              res+=chunk;
          });
  
          response.on('end',function(){
              if(res === 'ok'){
                console.log('Slack response')
                res = `{ "response": "Slack notification sent" }`
              }
              obj=JSON.parse(res);            
              console.log("object: ", obj)
              resolve(obj);
          });
      }
      let request = https.request(options,callback);
      request.write(data);
      request.end();
    });

  }catch(e){
    console.log(e)
  }
}

module.exports.handler = async (event, context, callback) => {
  try {
    const { state, pipeline } = event;
    
    let snykRequestDetails;
    let snykResponse;
    let slackPipelineMessageDetails;
    let slackSnykMessageDetails;
    let slackSnykMessageResponse;
    let slackPipelineMessageResponse;

    console.log('event:', event);

    switch (state) {
      case 'STARTED':
        // Pipeline Slack message
        slackPipelineMessageDetails = await slackApiRequestDetails(getPipelineStatusMessage(state, pipeline, STATUS_GIF.started));
        slackPipelineMessageResponse = await apiRequest(slackPipelineMessageDetails.data, slackPipelineMessageDetails.options);
        break;
      case 'SUCCEEDED':
        // Get project details from Snyk
        snykRequestDetails = await getSnykApiRequestDetails();
        snykResponse = await apiRequest(snykRequestDetails.data, snykRequestDetails.options);
        slackSnykMessageDetails = await slackApiRequestDetails(snykResponse.issues);
        slackSnykMessageResponse = await apiRequest(slackSnykMessageDetails.data, slackSnykMessageDetails.options);
        // Pipeline Slack message
        slackPipelineMessageDetails = await slackApiRequestDetails(getPipelineStatusMessage(state, pipeline, STATUS_GIF.succeeded));
        slackPipelineMessageResponse = await apiRequest(slackPipelineMessageDetails.data, slackPipelineMessageDetails.options);
        break;
      case 'FAILED':
        // Get project details from Snyk
        snykRequestDetails = await getSnykApiRequestDetails();
        snykResponse = await apiRequest(snykRequestDetails.data, snykRequestDetails.options);
        slackSnykMessageDetails = await slackApiRequestDetails(snykResponse.issues);
        slackSnykMessageResponse = await apiRequest(slackSnykMessageDetails.data, slackSnykMessageDetails.options);
        // Pipeline Slack message
        slackPipelineMessageDetails = await slackApiRequestDetails(getPipelineStatusMessage(state, pipeline, STATUS_GIF.failed));
        slackPipelineMessageResponse = await apiRequest(slackPipelineMessageDetails.data, slackPipelineMessageDetails.options);
        break;
      case 'CANCELED':
        // Pipeline Slack message
        slackPipelineMessageDetails = await slackApiRequestDetails(getPipelineStatusMessage(state, pipeline, STATUS_GIF.canceled));
        slackPipelineMessageResponse = await apiRequest(slackPipelineMessageDetails.data, slackPipelineMessageDetails.options);
        break;
      default:
        // Pipeline Slack message
        slackPipelineMessageDetails = await slackApiRequestDetails(getPipelineStatusMessage(state, pipeline));
        slackPipelineMessageResponse = await apiRequest(slackPipelineMessageDetails.data, slackPipelineMessageDetails.options);
        break;
    }
    console.log("Slack Snyk message response:", slackSnykMessageResponse);
    console.log("Slack pipeline message response:", slackPipelineMessageResponse);
  }catch(err){
    console.log("error:", err);
  }
}
