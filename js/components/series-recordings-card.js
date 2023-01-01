import store from "../store.js";
import myUtils from "../utils.js";
import myCustomElements from "./custom-elements.js";
import mySeriesItemElement from "./series-card.js";

const { defineComponent } = Vue;
const state = store().state;
const utils = myUtils();
const customElements = myCustomElements()
const seriesItemElement = mySeriesItemElement().seriesItemElement

export default()=>({
    seriesElement
})

const seriesElement = defineComponent({
    props: {
        series: Array
    },
    setup() {
        return {'state': state}
    },
    data() {
        return {
        }
    },
    components: {
        'svg-icon': customElements.SVGElement,
        'series-item': seriesItemElement
    },
    methods: {
        getDateTime: utils.getDateTime,
    },
    computed: {
        sortedSeries() {
            if (!this.series) {
                return []
            }
            return this.series.sort(function(a, b){ return a.name.localeCompare(b.name) })
        }
    },
    template: `
    <p/>
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">
        Series to record
        </h5>
        <h6 v-if="this.sortedSeries.length == 0" class="card-subtitle mb-2 text-muted">
        None
        </h6>
        <p class="card-text">
            <div class="list-group">
                <series-item v-for="recording in this.sortedSeries" :series="recording">
            </div>
        </p>
     </div>
    </div>
    `
});
