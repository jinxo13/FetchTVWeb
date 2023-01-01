import myUtils from "../utils.js";
import myStore from "../store.js";
import myCustomElements from "./custom-elements.js";
import myModalPrompt from "./modal-prompt.js";

const { defineComponent } = Vue;
const prompt = myModalPrompt();
const utils = myUtils();
const customElements = myCustomElements()
const store = myStore()

export default()=>({
    recordingElement
})

const recordingElement = defineComponent({
    props: {
        recording: Object,
        type: String
    },
    setup() {
        return {
        }
    },
    components: {
        'svg-icon': customElements.SVGElement
    },
    computed: {
        recordingTitle() {
            let title = ''
            if (this.recording.episode) {
                title = "S" + this.recording.season + "E" + this.recording.episode
            }
            else if (this.recording.season) {
                title = this.recording.season
            }
            if (this.recording.episode_title) {
                title += ((title) ? ' - ' : '') + this.recording.episode_title
            }
            return title
        },
        recordingVideoUrl() {
            return this.recording.dlna_url + '.mpg'
        },
        recordingProgramStartTime() {
            return utils.getTime(this.recording.program_start)
        },
        recordingHeading() {
            return utils.getDateTime(this.recording.record_start) + ', ' + this.getDuration() +
                ((this.type === 'stored') ? ', ' + utils.getFileSize(this.recording.size*1024): '')
        },
        recordingStatus() {
            let currentTime = new Date().getTime();
            if (currentTime >= this.recording.record_start && currentTime <= this.recording.record_end) {
                return 'Recording'
            }
            else if (utils.getDate(currentTime) === utils.getDate(this.recording.program_start) ||
                    utils.getDate(currentTime) === utils.getDate(this.recording.program_end)) {
                return 'Scheduled'
            }
            return 'Future'
        },
        box() {
            return store.getBox(this.recording.terminal_id)
        }
    },
    methods: {
        getDuration() {
            let duration = (this.recording.record_end - this.recording.record_start)/1000
            let i = Math.min(Math.floor(Math.log(duration) / Math.log(60)), 2);
            return (duration / Math.pow(60, i)).toFixed(2) * 1 + ' ' + ['sec', 'min', 'hr'][i];
        },
        getIcon(channel_id) {
             return channel_id in this.box.channels ? this.box.channels[channel_id].image_url : '';
        },
        getTitle(channel_id) {
            return channel_id in this.box.channels ? this.box.channels[channel_id].description : '';
        },
        watchClicked() {
            prompt.showModalOk('Help', prompt.helpItems['watch'])
        },
        cancel_clicked() {
            let myRecording = this.recording
            prompt.showModalYesNo('Confirm?', 'Are you sure you want to cancel this recording?', function() {
                let params = {
                    "terminal_id": myRecording.terminal_id,
                    "program_id": myRecording.program_id
                }
                utils.request("cancel_recording", params)
                .then(response => {
                    if (!response.ok) {
                        prompt.showModalOk('Error', 'An error occurred cancelling the recording. Please try again.');
                    }
                })
            })
        },
        delete_clicked(e) {
            e.preventDefault();
            let myRecording = this.recording
            prompt.showModalYesNo('Delete?',
                'Are you sure you want to delete:<br><b>' + this.recording.name + '</b> ' + this.recordingTitle + '?',
                function() {
                    let params = {
                        "terminal_id": myRecording.terminal_id,
                        "recording_id": myRecording.id
                    }
                    utils.request("delete_recording", params)
                    .then(response => {
                        if (!response.ok) {
                            prompt.showModalOk('Error', 'An error occurred deleting the recording. Please try again.');
                        }
                    })
                }
            );
        }
    },
    template: `
    <a href="#" class="list-group-item list-group-item-action flex-column align-items-start">
    <div class="d-flex w-100 justify-content-between">
      <h5 class="mb-1">
        <img style="background-color: black; width: 2.5em" :title="this.getTitle(this.recording.channel_id)" :src="this.getIcon(this.recording.channel_id)"/>
        {{ this.recording.name }}
          <div class="btn-group btn-group-sm me-2" role="group" aria-label="Second group">
            <a @click.prevent="watchClicked()" :href="recordingVideoUrl" type="button" class="btn btn-outline-secondary">
              <svg-icon name="tv" title="watch"/>
            </a>
            <button @click="remoteClicked(btn)" type="button" class="btn btn-outline-secondary" :disabled="false">
              <svg-icon name="cast"/>
            </button>
            <button v-if="this.type == 'record'" @click="cancel_clicked()" type="button" class="btn btn-outline-secondary" :disabled="false">
              <svg-icon name="x-circle" title="cancel"/>
            </button>
            <button v-if="this.type == 'stored'" @click="delete_clicked($event)" type="button" class="btn btn-outline-secondary" :disabled="false">
              <svg-icon name="x-circle" title="delete"/>
            </button>
          </div>
        </div>
        </h5>
        <h6 class="mb-1">
          <span v-if="this.type == 'record'" :class="['badge', 'rounded-pill', (recordingStatus == 'Recording') ? 'bg-danger' : 'bg-secondary']">{{ recordingStatus }}</span>
          {{ recordingHeading }}
        </h6>
        <p class="mb-1">
        {{ recordingTitle }} @ {{ this.recordingProgramStartTime }}
        </p>
        <small>{{ this.recording.description }}</small>
      </div>
      </a>
    `
});
