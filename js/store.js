export default ()=>({
    state,
    channelIcons,
    getBox,
    setBox,
    getRecordingIds,
    getSeriesLinks
})

const { reactive } = Vue
const state = reactive({
    boxes: {},
    channels: null,
    epg: null,
    activeRecordings: null,
    seriesRecordings: null,
    epgRegions: null,
    selectedProgram: null,
    recordings: [],
    prompt: { 'title': 'Prompt', 'text': 'Do something....', 'buttons': [], 'action': false}
})

const channelIcons = {}

function getBox(terminal_id) {
    if (terminal_id in state.boxes) {
        return state.boxes[terminal_id]
    }
    return null
}

function setBox(terminal_id, box) {
    box.channels = []
    box.current_program = {}
    box.lastReceived = new Date()
    state.boxes[terminal_id] = box
}

function getRecordingIds() {
    let result = {}
    if (state.activeRecordings) {
        for (let key in state.activeRecordings) {
            let recording = state.activeRecordings[key]
            result[recording.program_id] = recording.terminal_id
        }
    }
    return result
}

function getSeriesLinks() {
    let result = {}
    if (state.seriesRecordings) {
        for (let key in state.seriesRecordings) {
            let series = state.seriesRecordings[key]
            result[series.id] = series.terminal_id
        }
    }
    return result
}
