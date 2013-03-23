Components.utils.import("resource://calendar/modules/calUtils.jsm");

Components.utils.import('resource://stormcows/rtmclient.jsm');
Components.utils.import('resource://stormcows/logger.jsm');


function StormCowsConfig() {
}

StormCowsConfig.prototype = {
  
  mTempFrob: null,
  mLblAuthStatus: null,
  mBtnLogout: null,
  mBtnStartAuth: null,
  mBtnFinishAuth: null,
  mMenulistCalendars: null,
  mBtnAddCalendar: null,
  
  setAuthenticated: function() {
    stormcowsLogger.debug('settingsDialog.js:setAuthenticated()');
    
    this.mLblAuthStatus.textContent = "Authenticated";
    this.mBtnLogout.disabled = false;
    this.mBtnStartAuth.disabled = true;
    this.mBtnFinishAuth.disabled = true;
    this.mMenulistCalendars.disabled = false;
    this.mBtnAddCalendar.disabled = false;
    
    let data = {
      callback: this.populateCalendarList.bind(this)
    }
    rtmClient.request('getLists', data);
  },
  
  setNotAuthenticated: function() {
    stormcowsLogger.debug('settingsDialog.js:setNotAuthenticated()');
    
    this.mLblAuthStatus.textContent = "Not Authenticated";
    this.mBtnLogout.disabled = true;
    this.mBtnStartAuth.disabled = false;
    this.mBtnFinishAuth.disabled = true;
    this.mMenulistCalendars.disabled = true;
    this.mBtnAddCalendar.disabled = true;
  },
  
  populateCalendarList: function(aLists) {
    stormcowsLogger.debug('settingsDialog.js:populateCalendarList()');
    
    if (!aLists) {
      stormcowsLogger.debug('settingsDialog.js:populateCalendarList()', 'API request resulted in an error.');
      return;
    }
    
    let menu = this.mMenulistCalendars.firstElementChild;
    for (let i=0; i<aLists.length; i++) {
      let menuItem = document.createElement('menuitem');
      menuItem.setAttribute('label', aLists[i].name);
      menuItem.setAttribute('value', aLists[i].id);
      
      menu.appendChild(menuItem);
    }
  },
  
  doLoad: function() {
    stormcowsLogger.debug('settingsDialog.js:doLoad()');
    
    this.mLblAuthStatus = document.getElementById('stormcows-config-authentication-status');
    this.mBtnLogout = document.getElementById('stormcows-config-logout');
    this.mBtnStartAuth = document.getElementById('stormcows-config-startauth-btn');
    this.mBtnFinishAuth = document.getElementById('stormcows-config-finishauth-btn');
    this.mMenulistCalendars = document.getElementById('stormcows-config-calendar-menulist');
    this.mBtnAddCalendar = document.getElementById('stormcows-config-addcalendar-btn');
    
    if (rtmClient.authToken) {
      this.setAuthenticated();
    } else {
      this.setNotAuthenticated();
    }
  },
  
  doOK: function() {
    stormcowsLogger.debug('settingsDialog.js:doOK()');
    return true;
  },
  
  doStartAuth: function() {
    stormcowsLogger.debug('settingsDialog.js:doStartAuth()');
    
    this.mBtnStartAuth.disabled = true;
    
    let data = {
      callback: this.doStartAuth_callback.bind(this)
    };
    rtmClient.request('getFrob', data);
  },
  
  doStartAuth_callback: function(aFrob, aAuthUrl) {
    stormcowsLogger.debug('settingsDialog.js:doStartAuth_callback()');
    
    if (!aFrob || !aAuthUrl) {
      stormcowsLogger.debug('settingsDialog.js:doStartAuth_callback()', 'API request resulted in an error');
      this.mBtnStartAuth.disabled = false;
      return;
    }
    
    this.mTempFrob = aFrob;
    stormcowsLogger.debug('settingsDialog.js:doStartAuth_callback()', 'AuthURL: ' + aAuthUrl.spec);
    
    // The code below for opening a page in a browser content tab came from here:
    // https://developer.mozilla.org/en-US/docs/Thunderbird/Content_Tabs
    let tabmail = document.getElementById("tabmail");
    if (!tabmail) {
      // Try opening new tabs in an existing 3pane window
      let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                              .getService(Components.interfaces.nsIWindowMediator)
                              .getMostRecentWindow("mail:3pane");
      if (mail3PaneWindow) {
        tabmail = mail3PaneWindow.document.getElementById("tabmail");
        mail3PaneWindow.focus();
      }
    }
 
    if (tabmail)
      tabmail.openTab("contentTab", { contentPage: aAuthUrl.spec });
    else
      window.openDialog("chrome://messenger/content/", "_blank",
                        "chrome,dialog=no,all", null,
                        { tabType: "contentTab",
                          tabParams: {contentPage: aAuthUrl.spec} });
    
    this.mBtnFinishAuth.disabled = false;
  },
  
  doFinishAuth: function() {
    stormcowsLogger.debug('settingsDialog.js:doFinishAuth()');
    
    let frob = this.mTempFrob;
    this.mTempFrob = null;
    
    this.mBtnFinishAuth.disabled = true;
    
    let data = {
      callback: this.doFinishAuth_callback.bind(this),
      frob: frob
    };
    rtmClient.request('getToken', data);    
  },
  
  doFinishAuth_callback: function(aAuthToken) {
    stormcowsLogger.debug('settingsDialog.js:doFinishAuth_callback()');
    
    if (!aAuthToken) {
      stormcowsLogger.debug('settingsDialog.js:doFinishAuth_callback()', 'API request resulted in an error');
      this.mBtnStartAuth.disabled = false;
      return;
    }
    
    rtmClient.authToken = aAuthToken;
    this.setAuthenticated();
  },
  
  doAddCalendar: function() {
    stormcowsLogger.debug('settingsDialog.js:doAddCalendar()');
    
    let menuItem = this.mMenulistCalendars.selectedItem;
    let listId = menuItem.value;
    let listName = menuItem.label;
    
    let calManager = cal.getCalendarManager();
    let url = cal.makeURL('stormcows://_unused');
    let newCal = calManager.createCalendar('stormcows', url);
    newCal.name = listName;
    newCal.setProperty('listId', listId);
    
    calManager.registerCalendar(newCal);
  },
  
  doLogout: function() {
    stormcowsLogger.debug('settingsDialog.js:doLogout()');
    
    rtmClient.authToken = '';
    this.setNotAuthenticated();
  }
};
