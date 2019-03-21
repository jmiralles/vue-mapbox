import Vue from 'vue'

import App from './App';

const { log } = console;


function fetchPlaces() {
  function _fetch() {
    return new Promise((resolve, reject) => {
      fetch("../data.json")
        .then((response) => {
          return response.json()
        })
        .then(data => {
          return resolve(data)
        })
        .catch(error => {
          log("Error retrieving data: ", error);
          reject(error);
        });
    });
  }

  _fetch().then(initApp).catch(e => log("error ===>>>", e));
}

function initApp(places) {
  
  let appState = {
    places
  };
  
  App.data = function() {
    return {
      places: appState.places
    }
  }
  

  new Vue({
    render: h => h(App),
  }).$mount('#app')

  
}


fetchPlaces();
