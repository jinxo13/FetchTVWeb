import myStore from "./store.js";
import myModalPrompt from "./components/modal-prompt.js";
import myActiveRecordingsElement from "./components/active-recordings-card.js";
import mySeriesRecordingsElement from "./components/series-recordings-card.js";
import myUtils from "./utils.js";
import myFetchBox from "./components/box-card.js";
import myFetchRecordings from "./components/recordings-card.js";
import myTvGuideElement from "./components/tvguide-grid.js";
import mySearchGuideElement from "./components/search-guide-card.js";
import myProgramRecord from "./components/program-record-card.js";

let utils = myUtils()
const boxElement = myFetchBox().boxElement
const recordingsElement = myFetchRecordings().recordingsElement
const activeRecordingsElement = myActiveRecordingsElement().recordingsElement;
const seriesRecordingsElement = mySeriesRecordingsElement().seriesElement;
const tvGuideElement = myTvGuideElement().guideElement;
const searchGuideElement = mySearchGuideElement().searchGuideElement;
const programRecordElement = myProgramRecord().programRecordElement;

const { createApp } = Vue;

    const store = myStore();
    const state = store.state;
    const prompt = myModalPrompt();

    let lastMessageTime = 0;
    function startListener() {
      setInterval(function() {
        let params = {
            'time': lastMessageTime
        }
        utils.request('messages', params)
        .then(response => {
            if(response.ok){
                return response.json()
            }
        })
        .then(response => {
          //if just starting up skip the cached messages
          /*
          if (lastMessageTime === 0 && response.length > 0) {
            lastMessageTime = Math.round(response[response.length-1].time)
            return
          }
          */
          for (let key in response) {
            processMessage(response[key])
          }
        })
      }, 1000);
    }

    function processMessage(msg) {
        lastMessageTime = Math.round(msg.time);
        let message = msg.message;
        if (msg.group == 'BOX') {
          set_data('boxes');
          set_data('epg');
          return;
        }
        let box =  store.getBox(msg.terminal_id)
        if (!box) {
            return;
        }
        box.lastReceived = new Date();
        switch(msg.group) {
            case 'STATE':
                box.state = message;
                set_data('current_program', {'box_id': box.terminal_id});
                break;
            case 'FUTURE_RECORDINGS':
                state.activeRecordings = message;
                break;
            case 'SERIES':
                set_data('series_recordings')
                break;
            case 'RECORDINGS':
            case 'RECORDING':
                // Update or add value
                let messages = {}
                messages[message.id] = message
                if (msg.command == 'RECORDINGS_DELETE') {
                    for (let key in message) {
                        message[key].pending_delete = true
                        messages[message[key].id] = message[key]
                    }
                }
                let updated = false;
                for (let key in state.recordings) {
                    let recording = state.recordings[key]
                    if (recording.id in messages) {
                        if (messages[recording.id].size) {
                          state.recordings[key] = messages[recording.id]
                        }
                        updated = true;
                        break;
                    }
                }
                if (!updated) {
                    state.recordings.push(message);
                }
                set_data('active_recordings')
                break;
        }
    }

    function set_data(path, params={}) {
        utils.request(path, params)
        .then(response => {
            if(response.ok){
                return response.json()
            }
        })
        .then(response => {
            const box = store.getBox(params.box_id)
            switch (path) {
              case 'epg':
                store.state.epg = response
                set_data('epg_regions', {})
                break;
              case 'boxes':
                for (let key in response) {
                    store.setBox(key, response[key])
                    set_data('current_program', {'box_id': key})
                    set_data('dvb_channels', {'box_id': key})
                }
                set_data('active_recordings', {});
                set_data('series_recordings', {});
                set_data('recordings', {});
                break;
              case 'dvb_channels':
                box.channels = response;
                break;
              case 'current_program':
                box.current_program = response;
                break;
              case 'active_recordings':
                state.activeRecordings = response; break;
              case 'series_recordings':
                state.seriesRecordings = response; break;
              case 'recordings':
                state.recordings = response; break;
              case 'epg_regions':
                state.epgRegions = response; break;
            }
        }
        )
        .catch(err => {
            console.log(err);
        })
    }

  const fetchTvApp = createApp({
    setup() {
        return {'state': state}
    },
    data() {
      return {
      }
    },
    methods: {
        setEpgDay(day) {
            alert(day);
        }
    },
    computed: {
        allChannels() {
            let result = {}
            for (let key in state.boxes) {
                let channels = store.getBox(key).channels
                for (let channel in channels) {
                    let item = channels[channel]
                    result[item.epg_id] = item
                }
            }
            return result
        }
    },
    components: {
        'box-card': boxElement,
        'recordings-card': recordingsElement,
        'active-recordings-card': activeRecordingsElement,
        'series-recordings-card': seriesRecordingsElement,
        'modal-prompt': prompt.promptElement,
        'program-record-card': programRecordElement,
        'tv-guide-grid': tvGuideElement,
        'search-guide-card': searchGuideElement
    },
    mounted() {
        set_data('boxes');
        set_data('epg');
    },
    template: `

    <modal-prompt/>
    <program-record-card/>

    <div class="tab-content" id="myTabContent">
      
      <div v-if="Object.values(state.boxes).length == 0">
        <p/>
        <button class="btn btn-primary" type="button" disabled>
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Waiting for FetchTV Boxes...
        </button>
      </div>

      <div class="tab-pane fade show active" id="boxes" role="tabpanel" aria-labelledby="boxes-tab">
        <box-card v-if="state.boxes" v-for="box in Object.values(state.boxes)" :box="box"/>
        <active-recordings-card :recordings="state.activeRecordings"/>
      </div>

      <div class="tab-pane fade" id="guide" role="tabpanel" aria-labelledby="guide-tab">
          <tv-guide-grid :channels="allChannels"/>
      </div>

      <div class="tab-pane fade" id="search" role="tabpanel" aria-labelledby="search-guide-tab">
          <search-guide-card/>
      </div>

      <div class="tab-pane fade" id="stored" role="tabpanel" aria-labelledby="stored-tab">
         <recordings-card/>
      </div>

      <div class="tab-pane fade" id="scheduled" role="tabpanel" aria-labelledby="scheduled-tab">
         <active-recordings-card :recordings="state.activeRecordings"/>
         <series-recordings-card :series="state.seriesRecordings"/>
      </div>

    </div>
    `
  })

  fetchTvApp.mount('#fetch-boxes')

  startListener();
