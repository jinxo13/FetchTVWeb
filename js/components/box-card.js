import myStore from "../store.js";
import myModalPrompt from "./modal-prompt.js";
import myActiveRecordingsElement from "./active-recordings-card.js";
import myUtils from "../utils.js";
import myCustomElements from "./custom-elements.js";
import myChannelElement from "./modal-channels.js";

export default()=>({
    boxElement
})

const utils = myUtils()
const customElements = myCustomElements()
const channelElement = myChannelElement().channelElement
const prompt = myModalPrompt()
const activeRecordingsElement = myActiveRecordingsElement().recordingsElement;

function flashRemote(clr, id) {
  let cls = (clr === 'green') ? 'text-bg-success' : 'text-bg-danger'
  let $ele = $('#'+id);
  $ele.removeClass('text-bg-warning');
  $ele.addClass(cls);
  if (clr === 'green') {
      setTimeout(function(){ $ele.removeClass(cls); },2000);
  }
}

const { defineComponent } = Vue;

  let store = myStore();
  let state = store.state;

  const boxElement = defineComponent({
    props: {
        box: Object
    },
    setup() {
        return {'state': state}
    },
    data() {
      return {
        lastMessage: "None",
        filteredChannels: [],
        channels: [],
      }
    },
    components: {
        'modal-channels': channelElement,
        'svg-icon': customElements.SVGElement,
        'active-recordings-card': activeRecordingsElement
    },
    methods: {
        getTime: utils.getTime,
        getData: utils.getData,
        displayData: utils.displayData,
        watchClicked() {
            prompt.showModalOk('Help', prompt.helpItems['watch-live'])
        },
        remoteClicked: function(btn) {
            if (!this.box) {
                return
            }
            if (btn === 'channel') {
                $("#"+this.channelsId).modal("show");
                return
            }
            if (btn === 'play' || btn === 'pause') {
                btn = 'PlayPause';
            }
            let params = {
                'terminal_id': this.box.terminal_id,
                'remote_key':  btn.charAt(0).toUpperCase() + btn.slice(1)
            }
            let $remoteLight = $('#remote-light' + this.box.ip_address)
            $remoteLight.removeClass('text-bg-danger');
            $remoteLight.addClass('text-bg-warning');
            utils.request("send_remote_key", params)
            .then(response => {
                if(response.ok){
                    flashRemote('green', this.remoteId);
                } else{
                    flashRemote('red', this.remoteId);
                }
            })
            .catch(err => {
                flashRemote('red', this.remoteId);
                console.log(err);
            })
        },
        checkDisabled(btn) {
            if (!this.box) {
                return
            }
            let playState = this.box.state.play_state;
            if (playState == 'Idle') {
                return true;
            }
            switch(btn) {
                case 'play': return ['Live', 'Playing'].includes(playState);
                case 'pause': return ['Paused'].includes(playState);
                case 'stop': return ['Live'].includes(playState);
            }
            return false
        },
        getBtnImageName(btn) {
            if (btn == 'channel') {
                return 'chevron-expand'
            }
            return btn
        }
    },
    computed: {
        currentProgramTitle() {
            return (this.box.current_program.title) ? this.box.current_program.title : 'No current program'
         },
        currentProgramDetail() {
            return (this.box.current_program.title) ? this.getTime(this.box.current_program.start) + ' - '
             + this.getTime(this.box.current_program.end) : ''
        },
        channelsId() {
            return 'channels' + this.box.ip_address.replace(/\./g ,'_')
        },
        current_channel() {
            if (this.box && this.box.channels) {
                let channel_id = Number(this.box.state.channel_id);
                let channel = this.box.channels[channel_id]
                if (channel) {
                    return channel
                }
            }
            return false;
        },
        fetchBoxTitle() {
            if (this.box) {
                return `${this.box.hardware.name} (${this.box.hardware.type}) - ${this.box.ip_address}`
            }
            return 'Unknown'
        },
        remoteId() {
            return 'remote-light' + this.box.ip_address.replace(/\./g ,'_')
        },
        statusClass() {
            if (!this.box) {
                return 'bg-secondary'
            }
            switch (this.box.state.play_state) {
                case 'Idle': return 'bg-dark';
                case 'Live': return 'bg-warning';
                default: return 'bg-warning';
            }
        },
        isAlive() {
            return this.box.lastReceived >= new Date() - 1 * 60 * 1000 // 1 minute
        },
        boxState() {
            return (this.box) ? this.box.state.play_state : 'Unknown'
        },
        usedSpace() {
            if (this.box) {
              return Math.round((this.box.storage.recordings_space - this.box.storage.free_space)/this.box.storage.recordings_space * 100);
            }
            return 0
        },
        usedSpaceLabel() {
            if (this.box) {
              return this.box.storage.free_space + ' MB remains';
            }
            return ''
        },
        activeRecordings() {
            if (!state.activeRecordings) return []
            let myBox = this.box
            return state.activeRecordings.filter(function(rec) { return rec.terminal_id == myBox.terminal_id })
        }
    },
    mounted() {
        // Force isAlive recheck every 10 seconds
        let myBox = this.box
        setInterval(function() {
            myBox.lastReceived = new Date(myBox.lastReceived)
        }, 10000);
    },
    template: `
    <br>
    <div class="card" style="width: 30em">
      <div class="card-body">
        <h5 class="card-title">
          {{ (this.box) ? this.box.label : 'Fetch TV Box - Not Found' }}
          <button @click="displayData(this.box, $event)" type="button" :class="['btn', 'btn-sm', (this.isAlive) ? 'btn-success' : 'btn-danger']">{{ (this.isAlive) ? 'Up' : 'Down' }}</button>
        </h5>
        <h6 class="card-subtitle mb-2 text-muted">
          {{ this.fetchBoxTitle }}
        </h6>

                    <p/>
              <div class="progress" style="width: 25em">
                  <div class="progress-bar" role="progressbar" :style="{width: usedSpace + '%'}">{{usedSpace}}% ({{usedSpaceLabel}})</div>
              </div>
        Recordings <span class="badge bg-dark">{{ (this.box) ? this.box.recordings.items - this.box.recordings.pending_delete: 'Unknown' }}</span>
        Pending Delete <span class="badge bg-dark">{{ (this.box) ? this.box.recordings.pending_delete : 'Unknown' }}</span>

        <modal-channels v-if="this.box.channels" :boxId="this.box.terminal_id"/>
        <p/>
        <div class="card">
          <div class="card-body">
            <p class="card-text">

               <div>
                  <img style="background-color: black; float: left; margin: 0.2em;" :src="(this.current_channel) ? this.current_channel.image_url : ''" :alt="(this.current_channel) ? this.current_channel.name : ''">
                  <b>{{currentProgramTitle}}</b><br>
                  {{currentProgramDetail}}
                  <span :class="['badge', 'rounded-pill', statusClass]">{{ this.boxState }}</span>

              </div>

              <br>

              <div :id="this.remoteId" style="width: 1em; height: 1em;" class="rounded-circle text-bg-secondary p-1"></div>
              <p/>
                <div class="btn-group btn-group-sm me-2" role="group" aria-label="Second group">
                  <button @click="remoteClicked('power')" type="button" class="btn btn-outline-secondary">
                      <svg-icon name="power"/>
                  </button>
                </div>

                <div class="btn-group btn-group-sm me-2" role="group" aria-label="Second group">
                  <template v-for="btn in ['channel', 'pause', 'play', 'stop', 'record']">
                    <button @click="remoteClicked(btn)" type="button" class="btn btn-outline-secondary" :disabled="checkDisabled(btn)">
                      <svg-icon :name="getBtnImageName(btn)" :title="btn"/>
                    </button>
                  </template>
                 </div>

                 <div class="btn-group btn-group-sm me-2" role="group" aria-label="Second group">
                   <button @click="watchClicked()" type="button" class="btn btn-outline-secondary" :disabled="checkDisabled('watch')">
                      <svg-icon name="tv" title="watch"/>
                   </button>
                 </div>
           </p>
        </div>
        </div>
     </div>
    `
  })
