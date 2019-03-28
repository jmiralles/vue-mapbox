import MapboxCircle from "mapbox-gl-circle";
const { log } = console;
const CircleMode = {
  onSetup() {
    this.updateUIClasses({ mouse: "add" });
    return {};
  },
  onClick(state, e) {
    const initialRadius = 100;
    const fence = new MapboxCircle(e.lngLat, initialRadius, {
      editable: true,
      minRadius: 50,
      debugEl: document.getElementById('debug'),
      fillColor: "#29AB87"
    }).addTo(this.map);
    this.changeMode("simple_select");
    // console.log(circle);

    fence.on("radiuschanged", this.onRadiusChanged.bind(this));

  },
  onRadiusChanged(circle) {
    log(circle.radius);
  }
};

export default CircleMode;
