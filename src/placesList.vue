<template>
  <div>
    <div class="card" v-for="place in places" v-bind:key="place.placeId">
      <div @click="onclickPlaceCard(place)">{{place.config.name}}</div>
    </div>
  </div>
</template>

<script>
const { log } = console;
export default {
  props: ["places"],
  name: "places-list",
  methods: {
    onclickPlaceCard(place) {
      const {
        config: { geoFence }
      } = place;

      this.flyToGeofence(geoFence);
    },
    flyToGeofence(geoFence) {
      log(this.$root);
      this.$root.$emit("flyto", geoFence);
    }
  }
};
</script>

<style>
.card {
  border: 1px solid #ccc;
}
.card div {
  padding: 10px;
}
</style>
