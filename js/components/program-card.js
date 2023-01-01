import myUtils from "../utils.js";
import myStore from "../store.js";
import myCustomElements from "./custom-elements.js";
import myModalPrompt from "./modal-prompt.js";
import myProgramRecord from "./program-record-card.js";

const { defineComponent } = Vue;
const prompt = myModalPrompt();
const utils = myUtils();
const customElements = myCustomElements()
const store = myStore()
const state = store.state;
const programRecord = myProgramRecord();

export default()=>({
    programElement
})

const programElement = defineComponent({
    props: {
        match: Object
    },
    setup() {
        return {
            'state': state
        }
    },
    components: {
        'svg-icon': customElements.SVGElement
    },
    computed: {
        program() { return this.match['program'] },
        program_ids() { return this.match['program_ids'] },
        epg_channels() { return this.match['epg_channels'] },
        episodeTitle() {
            let details = ''
            let program = this.program
            if (program.episode_no) {
                details = "S" + program.series_no + "E" + program.episode_no
            }
            else if (program.series_no) {
                details = program.series_no
            }
            if (program.episode_title) {
                details += ((details) ? ' - ' : '') + program.episode_title
            }
            return details
        }
    },
    methods: {
        getDateTime: utils.getDateTime,
        programClicked(program, e) {
            e.preventDefault()
            programRecord.showModal(this.match);
        },
        isRecording(program) {
            let recordingIds = store.getRecordingIds()
            let seriesLinks = store.getSeriesLinks()
            if (program.series_link in seriesLinks) {
                program['terminal_id'] = seriesLinks[program.series_link]
                return 'S'
            }
            let all = new Set([].concat(this.program_ids, Object.keys(recordingIds).map(v=>parseInt(v))));
            if (all.size < this.program_ids.length +  Object.keys(recordingIds).length) {
                program['terminal_id'] = recordingIds[program.program_id]
                return 'P'
            }
            return ''
        },
        getIcon(channel_id) {
            // Cache icon for subsequent lookups
            for (let key in state.epg) {
                let channel = state.epg[key]['channel'];
                if (channel.id == channel_id) {
                    return channel.image_url;
                }
            }
            return "not_found";
        }
    },
    template: `
    <a href="#" @click="this.programClicked(program, $event)" class="list-group-item list-group-item-action flex-column align-items-start">
      <img v-for="channel_id in new Set(this.epg_channels)" style="background-color: black; width: 2.5em" :src="this.getIcon(channel_id)"/>
      <h5 class="mb-1">
      {{ this.program.title }}
      <span v-if="this.isRecording(program)" class="badge rounded-pill bg-danger">R</span>
      </h5>
      <h6 class="mb-1">
        {{ episodeTitle }} @ {{ getDateTime(this.program.start) }}
      </h6>
      <small>{{ this.program.synopsis }}</small>
      <br>
    </a>
    `
});
