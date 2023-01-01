import store from "../store.js";
import myCustomElements from "./custom-elements.js";
import myRecordingElement from "./recording-card.js";
import myUtils from "../utils.js";

export default()=>({
    recordingsElement
})

const { defineComponent } = Vue;

const DEFAULT_FILTER = 'series'
const DEFAULT_SORT= 'date'

const utils = myUtils()
const state = store().state;
const customElements = myCustomElements()
const recordingElement = myRecordingElement().recordingElement

  const recordingsElement = defineComponent({
    setup() {
        return {
            'state': state,
            'DEFAULT_SORT': DEFAULT_SORT,
            'DEFAULT_FILTER': DEFAULT_FILTER
        }
    },
    data() {
      return {
        searchQuery: null,
        sort_type: DEFAULT_SORT,
        sort_direction: 'asc',
        sort_prev: null,
        filter: DEFAULT_FILTER
      }
    },
    components: {
        'svg-icon': customElements.SVGElement,
        'recording-item': recordingElement
    },
    methods: {
        displayData: utils.displayData,
        setSort(btn) {
            this.sort_type = btn;
            this.sort_direction = (this.sort_direction === 'desc') ? 'asc' : 'desc';
        },
        getRecordings(show) {
            return this.filteredRecordings.filter(
                function(recording){
                    return recording.name === show.name
                })
        }
    },
    computed: {
        filteredRecordings() {
            // TODO: Simplify
            let result = state.recordings.filter(function(recording){ return !recording.pending_delete })
            if (this.searchQuery) {
                let query = this.searchQuery
                result = result.filter(function (recording) {
                    return recording.name.toLowerCase().includes(query.toLowerCase())
                } );
            }
            switch(this.filter) {
                case 'movies':
                    result = result.filter(function(recording){ return !recording.season && !recording.episode })
                    break;
                case 'series':
                    result = result.filter(function(recording){ return recording.episode })
                    break;
                case 'specials':
                    result = result.filter(function(recording){ return recording.season && !recording.episode })
                    break;
                case 'duplicates':
                    let result_ids = result.map(({name, episode_title, season, episode}) => { return name + episode_title + season + episode })
                    result = result.filter(function(recording){
                        let match = recording.name + recording.episode_title + recording.season + recording.episode
                        let numMatching = 0;
                        for(let key in result_ids) {
                            if(result_ids[key] === match) {
                               numMatching++;
                            }
                        }
                        return numMatching >= 2;
                    })
                    break;
            }
            if (this.sort_type !== this.sort_prev) {
                //Default sort to descending for size and date, but ascending for series
                //this.sort_direction = (this.sort_type == 'name') ? 'desc' : 'asc';
                this.sort_prev = this.sort_type;
            }
            let reverse = (this.sort_direction === 'desc')
            switch(this.sort_type) {
                case 'date':
                    result.sort(function (a,b) {
                        let comp = a.program_start - b.program_start
                        return reverse ? comp : -comp;
                    })
                    break;
                case 'size':
                    result.sort(function (a,b) {
                        let comp = a.size - b.size
                        return reverse ?  comp : -comp;
                    })
                    break;
                case 'name':
                    result.sort(function (a,b) {
                        let comp = (a.name + a.season + a.episode).localeCompare(b.name + b.season + b.episode)
                        return reverse ? comp : -comp;
                    })
                    break;
            }
            return result
        },
        filteredShows() {
            let names = []
            let shows = {}
            for (let key in this.filteredRecordings) {
                let recording = this.filteredRecordings[key]
                if (!names.includes(recording.name)) {
                    names.push(recording.name)
                    shows[recording.name] = {'id': 'show_' + key, 'name': recording.name, 'count': 1}
                }
                else {
                    shows[recording.name].count += 1
                }
            }
            return Object.values(shows);
        }
    },
    template: `
            <br>
          <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
            Sort:&nbsp;
              <template v-for="btn in ['date', 'size', 'name']">
                  <input @click="setSort(btn)" type="radio" class="btn-check" name="radioSort" :id="'radioSort'+btn" autocomplete="off" :checked="btn == DEFAULT_SORT">
                  <label class="btn btn-outline-primary" :for="'radioSort'+btn">
                      {{ btn }}
                      <svg-icon v-if="sort_type == btn && sort_direction == 'desc'" name="arrow-down-short" :title="btn"/>
                      <svg-icon v-if="sort_type == btn && sort_direction == 'asc'" name="arrow-up-short" :title="btn"/>
                  </label>
              </template>

            </div>
          &nbsp;
          <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
          Filter:&nbsp;
              <template v-for="btn in ['all', 'series', 'movies', 'specials', 'duplicates']">
                  <input @click="this.filter = btn" type="radio" class="btn-check" name="radioFilter" :id="'radioFilter' + btn" autocomplete="off" :checked="btn == DEFAULT_FILTER">
                  <label class="btn btn-outline-primary" :for="'radioFilter' + btn">
                  {{ btn }}
                  </label>
              </template>

            </div>

            <p/>
            <form>
              <div class="input-group flex-nowrap">
                <span class="input-group-text" id="addon-wrapping">Search</span>
                <input v-model="searchQuery" type="text" class="form-control" id="searchRecordings" placeholder="Recording name" aria-label="Username" aria-describedby="addon-wrapping">
              </div>
            </form>
            <p/>

          <h5><span @click="displayData(filteredRecordings)" class="badge bg-secondary">
            Recordings <span class="badge bg-dark">{{ filteredRecordings.length }}</span>
          </span></h5>

            <div v-if="this.filter == 'series'" class="accordion accordion-flush" id="accordionPanelsStayOpenExample">
              <div v-if="state.recordings" v-for="show in filteredShows" class="accordion-item">

                <h2 class="accordion-header" :id="show.id + '_label'">
                  <button class="btn btn-outline-secondary" type="button" data-bs-toggle="collapse" :data-bs-target="'#' + show.id" aria-expanded="true" :aria-controls="show.id">
                    {{ show.name }} <span class="badge bg-primary">{{ show.count }}</span>
                  </button>
                </h2>
                <div :id="show.id" class="accordion-collapse collapse" :aria-labelledby="show.id + '_label'">
                  <div class="accordion-body">
                    <template v-for="recording in getRecordings(show)">
                        <div style="margin-top: 0.4em; padding-top: 0.2em; border-top: solid 1px gray;">
                            <recording-item :recording="recording" type="stored"/>
                        </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="this.filter != 'series'" class="list-group">
                <recording-item v-for="recording in filteredRecordings" :recording="recording" type="stored"/>
            </div>
    `
  })