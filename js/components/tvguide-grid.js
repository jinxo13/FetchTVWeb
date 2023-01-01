import myStore from "../store.js";
import myModalPrompt from "./modal-prompt.js";
import myUtils from "../utils.js";
import myProgramRecord from "./program-record-card.js";
const { defineComponent } = Vue;
const prompt = myModalPrompt();
const utils = myUtils();

export default()=>({
    guideElement
})

const store = myStore()
const state = store.state
const programRecord = myProgramRecord();

const REGION_ALL = 0

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const guideElement = defineComponent({
    props: {
        channels: Object
    },
    setup() {
        return {'state': state}
    },
    data() {
        return {
            searchQuery: null,
            regionFilter: REGION_ALL,
            dayFilter: this.getDay(),
            channelFilter: 'All',
            epgDay: new Date(),
            loadingEpg: false
        }
    },
    components: {
        'svg-icon': customElements.SVGElement
    },
    computed: {
        filteredChannels() {
            let result = state.epg
            // Filter by Region
            let filter = this.regionFilter
            if (filter !== REGION_ALL) {
                result = result.filter(function(channel) {
                    return (channel['regionIds'].length > 0) ? channel['regionIds'][0] === Number(filter) : false
                })
            }
            // Filter by Channel
            filter = this.channelFilter
            if (filter !== 'All') {
                result = result.filter(function(channel) {
                    channel = channel['channel']
                    switch(filter) {
                        case 'HD': return channel.high_definition;
                        case 'Radio': return channel.type === 'radio';
                        case 'TV': return channel.type === 'tv';
                    }
                    return false
                })
            }
            return result
        }
    },
    methods: {
        getDateTime : utils.getDateTime,
        getTime : utils.getTime,
        getStartTime() {
            //Get milli-sec since start of day
            let today = new Date(this.epgDay.toDateString());
            let time = this.epgDay.getTime() - today.getTime();
            // Get current half-hour
            let halfHours = Math.round(time/1000/60/30)
            return today.getTime() + halfHours * 30*60*1000;
        },
        getHalfHours() {
            let results = []
            let currentTime = this.getStartTime()
            for (let i=0; i<48; i++) {
                results.push(utils.getTime(currentTime))
                currentTime += 30*60*1000
            }
            return results;
        },
        getProgramWidth(program) {
            let startTime = this.getStartTime()
            let endTime = startTime + 24 * 60 * 60 * 1000
            let duration = Math.min(program.end, endTime) - Math.max(program.start, startTime)
            return (duration / 1000 / 60 / 30) * 20
        },
        sortPrograms(programs) {
            //sort by start
            let startTime = this.getStartTime()
            let endTime = startTime + 24*60*60*1000
            programs.sort(function(a, b) { return a.start > b.start})
            return programs.filter(function(p) { return (p.end >= startTime && p.start <= endTime) })
        },
        getDetails(program) {
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
        getHoverDetails(program) {
            return program.title + '\n' + this.getDetails(program) + '\n' + utils.getDay(program.start) + ' @ ' + utils.getTime(program.start) + ' - ' + utils.getTime(program.end)
        },
        programClicked(program, e) {
            e.preventDefault()
            programRecord.showModal({'program': program, 'program_ids': [program.program_id], 'epg_channels': []});
        },
        getDays() {
            let today = utils.getDay(new Date().getTime())
            let splitPos = DAYS.indexOf(today.substring(0, 3))
            return DAYS.slice(splitPos).concat(DAYS.slice(0, splitPos))
        },
        getDay() {
            return utils.getDay(new Date().getTime()).substring(0,3)
        },
        getRegions() {
            //TODO: Simplify
            //Return 2 most popular regions
            let regionCount = {}
            let regions = {}
            let primaryChannels = []
            for (let channelKey in state.epg) {
                if (state.epg[channelKey]['regionIds'].length !== 0) {
                    let primaryRegion = String(state.epg[channelKey]['regionIds'][0])
                    if (!primaryChannels.includes(primaryRegion)) {
                        primaryChannels.push(primaryRegion)
                    }
                }
                for (let regionKey in state.epg[channelKey]['regions']) {
                    let region = state.epg[channelKey]['regions'][regionKey]
                    regions[region.id] = region
                    if (!(region.id in regionCount)) {
                        regionCount[region.id] = 1
                    }
                    else {
                        regionCount[region.id] += 1
                    }
                }
            }
            //Get most popular
            const LOCATIONS_TO_DISPLAY = 2
            let keys = Object.keys(regions)
            keys.sort(function(a, b){ return regionCount[b] - regionCount[a]})
            let result = [{'id': 0, 'location': 'All'}]
            let matches = 0
            for (let key in keys) {
                let region = regions[keys[key]]
                if (primaryChannels.includes(region.id)) {
                    result.push(region)
                    matches += 1
                    if (matches === LOCATIONS_TO_DISPLAY) {
                        break;
                    }
                }
            }
            return result
        },
        isRecording(program) {
            let recordingIds = store.getRecordingIds()
            let seriesLinks = store.getSeriesLinks()
            if (program.series_link in seriesLinks) {
                program['terminal_id'] = seriesLinks[program.series_link]
                return 'S'
            }
            if (program.program_id in recordingIds) {
                program['terminal_id'] = recordingIds[program.program_id]
                return 'P'
            }
            return ''
        },
        setEpgDay(day) {
            this.loadingEpg = true
            this.dayFilter = day
            let index = this.getDays().indexOf(day)
            let forDate = (index === 0) ? new Date() : new Date(new Date().toDateString())
            forDate.setDate(forDate.getDate() + this.getDays().indexOf(day))
            this.epgDay = forDate
            utils.request('epg', {'for_date': forDate.toISOString().substring(0, 10)})
                    .then(response => {
                        if(response.ok){
                            return response.json()
                        }
                    })
                    .then(response => {
                        state.epg = response
                        this.loadingEpg = false
                    }
                    );
        }
    },
    template: `
    <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
    Day:&nbsp;
      <template v-for="day in this.getDays()">
          <input @click="this.setEpgDay(day)" type="radio" class="btn-check" name="dayFilter" :id="'dayFilter' + day" autocomplete="off" :checked="day === this.getDay()">
          <label class="btn btn-outline-primary" :for="'dayFilter' + day">
          {{ day }}
          </label>
      </template>
    </div>

    <p/>
    <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
    Region:&nbsp;
      <template v-if="state.epg" v-for="region in this.getRegions()">
          <input @click="this.regionFilter = region.id" type="radio" class="btn-check" :regionId="region.id" name="regionFilter" :id="'regionFilter' + region.id" autocomplete="off" :checked="region.id == 0">
          <label class="btn btn-outline-primary" :for="'regionFilter' + region.id">
          {{ region.location }}
          </label>
      </template>
    </div>

      <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
        Type:&nbsp;
          <template v-for="btn in ['All', 'TV', 'HD', 'Radio']">
            <input @click="this.channelFilter = btn" type="radio" class="btn-check" name="chanRadio" :id="'chanRadio' + btn" autocomplete="off" :checked="btn == 'All'">
            <label class="btn btn-outline-primary" :for="'chanRadio' + btn">{{btn}}</label>
          </template>
      </div>

    <p/>
    <button v-if="this.loadingEpg" class="btn btn-primary" type="button" disabled>
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
    </button>


    <div v-if="!this.loadingEpg" id="tvGuide" style="margin: 0.5em;">
      <div class="row" style="width: 980em; border: solid 1px gray; background-color: white; border-bottom: none; overflow: auto; white-space:nowrap;">
        <div style="width: 10em; border-right: solid 1px gray;"><h5>Channel</h5></div>
        <div class="" style="width: 20em; border-right: solid 1px gray;" v-for="halfHour in this.getHalfHours()"><h5>{{halfHour}}</h5></div>
      </div>
      <div v-for="channel in filteredChannels" class="row" style="width: 980em; border-top: solid 1px gray; overflow: auto; white-space:nowrap;">
        <div style="width: 10em; border-right: solid 1px gray; border-left: solid 1px gray;">
          <img style="background: black; width: 5em;" :src="channel.channel.image_url" :title="channel.channel.description"/>
        </div>
        <div class="program" v-for="program in this.sortPrograms(channel.programs)" :style="'overflow: clip; background-color: ivory; border-right: solid 1px gray; width: ' + this.getProgramWidth(program) + 'em'"
         :title="getHoverDetails(program)" :name="program.id" :seriesLink="program.series_link">
          <a @click="this.programClicked(program, $event)" class="list-group-item" href="#">
          <span v-if="this.isRecording(program)" class="badge rounded-pill bg-danger">R</span>
          {{program.title}}<br>{{ getDetails(program) }}
          </a>
        </div>
      </div>
    </div>

    `
});
