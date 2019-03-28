import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App';

Vue.use(ElementUI);

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
