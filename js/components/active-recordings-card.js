import store from "../store.js";
import myUtils from "../utils.js";
import myCustomElements from "./custom-elements.js";
import myRecordingElement from "./recording-card.js";

const { defineComponent } = Vue;
const state = store().state;
const utils = myUtils();
const customElements = myCustomElements()
const recordingElement = myRecordingElement().recordingElement

export default()=>({
    recordingsElement
})

const recordingsElement = defineComponent({
    props: {
        recordings: Array
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
        'recording-item': recordingElement
    },
    methods: {
        getDateTime: utils.getDateTime,
    },
    template: `
    <p/>
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">
        Today's Recordings
        </h5>
        <h6 v-if="!this.recordings || this.recordings.length == 0" class="card-subtitle mb-2 text-muted">
        None
        </h6>
        <p class="card-text">

            <div class="list-group">
                <recording-item v-for="recording in this.recordings" :recording="recording" type="record">
            </div>

        </p>
     </div>
    </div>
    `
});
