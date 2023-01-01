import myUtils from "../utils.js";
import myStore from "../store.js";
import myCustomElements from "./custom-elements.js";
import myModalPrompt from "./modal-prompt.js";

const { defineComponent } = Vue;
const prompt = myModalPrompt();
const utils = myUtils();
const customElements = myCustomElements()
const store = myStore()
const state = store.state;

export default()=>({
    programRecordElement,
    showModal
})

function showModal(match) {
    state.selectedProgram = match;
    utils.sleep(200).then(() => {
        $('#guideModal').modal("show")
    })
}

const programRecordElement = defineComponent({
    setup() {
        return {
            'state': state
        }
    },
    data() {
        return {
            programIndex: 0
        }
    },
    components: {
        'svg-icon': customElements.SVGElement
    },
    computed: {
        selectedProgram() {
            return state.selectedProgram ? state.selectedProgram['program'] : false;
        },
        episodeTitle() {
            let details = ''
            let program = this.selectedProgram;
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
        },
        channels() {
            return state.selectedProgram['epg_channels'];
        },
        program_ids() {
            return state.selectedProgram['program_ids'];
        }
    },
    methods: {
        getDateTime: utils.getDateTime,
        isRecording() {
            let program = this.selectedProgram;
            let recordingIds = store.getRecordingIds()
            let seriesLinks = store.getSeriesLinks()
            if (program.series_link in seriesLinks) {
                program['terminal_id'] = seriesLinks[program.series_link]
                return 'S'
            }
            let match = Object.keys(recordingIds).filter(v=>{ return this.program_ids.indexOf(parseInt(v)) != -1; });
            if (match.length > 0) {
                program['terminal_id'] = recordingIds[match[0]]
                return 'P'
            }
            return ''
        },
        recordProgram() {
            let program = this.selectedProgram;
            program['epg_channel_id'] = this.channels[this.programIndex];
            program['program_id'] = this.program_ids[this.programIndex];
            utils.request("record_program", program)
            .then(response => {
                if (!response.ok) {
                    prompt.showModalOk('Error', 'An error occurred recording the program. Please try again.');
                }
            })
        },
        recordSeries() {
            let program = this.selectedProgram;
            utils.request("record_series", program)
            .then(response => {
                if (!response.ok) {
                    prompt.showModalOk('Error', 'An error occurred recording the series. Please try again.');
                }
            })
        },
        cancelRecording() {
            let program = this.selectedProgram;
            prompt.showModalYesNo('Confirm?', 'Are you sure you want to cancel this recording?', function() {
                utils.request("cancel_recording", program)
                .then(response => {
                    if (!response.ok) {
                        prompt.showModalOk('Error', 'An error occurred cancelling the recording. Please try again.');
                    }
                })
            })
        },
        cancelSeries(series) {
            prompt.showModalYesNo('Confirm?', 'Are you sure you want to cancel the series recording?', function() {
                utils.request("cancel_series", series)
                .then(response => {
                    if (!response.ok) {
                        prompt.showModalOk('Error', 'An error occurred cancelling the series. Please try again.');
                    }
                })
            })
        },
        getChannel(channel_id) {
            // Cache icon for subsequent lookups
            for (let key in state.epg) {
                let channel = state.epg[key]['channel'];
                if (channel.id == channel_id) {
                    return channel;
                }
            }
            return false;
        },
        getDetails() {
            let program = this.selectedProgram;
            let details = ''
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
        },
        getTimeDetails() {
            let program = this.selectedProgram;
            return utils.getDay(program.start) + ', ' + utils.getTime(program.start) + ' - ' + utils.getTime(program.end)
        }
    },
    template: `
    <div v-if="this.selectedProgram" class="modal fade" id="guideModal" tabindex="-1" aria-labelledby="guideModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="guideModalLabel">
              {{this.selectedProgram.title}}

             <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
              <template v-for="channel in this.channels.map(getChannel)">
                  <input @click="this.programIndex = this.channels.indexOf(channel.id.toString())" type="radio" class="btn-check" name="radioFilter" :id="'radioFilter' + channel.id" autocomplete="off" :checked="this.channels[this.programIndex] == channel.id">
                  <label class="btn btn-outline-primary" :for="'radioFilter' + channel.id">
                  <img style="background-color: black; width: 2.5em" :title="channel.description" :src="channel.image_url"/>
                  </label>
              </template>
            </div>
            </h5>
            <span v-if="this.isRecording()" class="badge rounded-pill bg-danger">R</span>
          </div>
          <div class="modal-body">
          <h5>{{this.getDetails()}}</h5>
          <h6>{{this.getTimeDetails()}}</h6>
          <div>{{this.selectedProgram.synopsis}}</div>
          </div>
          <div class="modal-footer">
            <button @click="this.recordProgram()" type="button" v-if="!['P', 'S'].includes(this.isRecording())" class="btn btn-danger">Record</button>&nbsp;
            <button @click="this.cancelRecording()" type="button" v-if="['P', 'S'].includes(this.isRecording())" class="btn btn-danger">Cancel Record</button>&nbsp;
            <button @click="this.recordSeries()" v-if="this.isRecording() != 'S'" type="button" class="btn btn-danger" :disabled="!this.selectedProgram.series_link">Record Series</button>
            <button @click="this.cancelSeries()" v-if="this.isRecording() == 'S'" type="button" class="btn btn-danger" :disabled="!this.selectedProgram.series_link">Cancel Series</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
    `
});
