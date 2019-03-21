<template>
  <div class="app-wrapper">
    <div class="places-list-container">
      <places-list :places="places"></places-list>
    </div>
    <div class="map-container" style="position: relative">
      <places-map :places="places"></places-map>
    </div>
  </div>
</template>

<script>
import PlacesMap from "./map.vue";
import PlacesList from "./placesList";

export default {
  name: "App",
  components: { PlacesMap, PlacesList }
};
</script>

<style>
.app-wrapper {
  display: flex;
  justify-content: flex-start;
}
.places-list-container {
  height: 600px;
  width: 400px;
}

.map-container {
  height: 600px;
  width: 800px;
}
</style>
