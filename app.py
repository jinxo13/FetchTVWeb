import logging
import os
from datetime import datetime

import flask
import requests
import json
from dotenv import load_dotenv
from flask import Flask, request, Response, stream_with_context
from pyfetchtv.api.const.remote_keys import RemoteKey
from pyfetchtv.api.fetchtv import FetchTV
from pyfetchtv.api.fetchtv_box_interface import RecordProgramParameters, RecordSeriesParameters

MAX_FILENAME = 255

app = Flask(__name__)
app.debug = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d %(levelname)s %(module)s - %(funcName)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)
# logger.setLevel('INFO')


def create_valid_filename(filename):
    result = filename.strip()
    # Remove special characters
    for c in '<>:"/\\|?*':
        result = result.replace(c, '')
    # Remove whitespace
    for c in '\t ':
        result = result.replace(c, '_')
    return result[:MAX_FILENAME]


def __error_response(err: str, status_code: int):
    response = flask.jsonify({'error': err})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.status_code = status_code
    logger.error('Bad request', Exception(err))
    return response


def __valid_response(vals):
    response = flask.jsonify(vals)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.status_code = 200
    return response


@app.route('/messages')
def messages():
    time = request.args.get('time', default=0)
    result = [v.to_dict() for v in fetchtv.messages if v.time > int(time)]
    return __valid_response(result)


def is_not_connected():
    if fetchtv.is_connected:
        return False
    return __error_response('login failed', 200)


@app.route("/boxes")
def boxes():
    result = is_not_connected()
    if result:
        return result
    result = {}
    for v in fetchtv.get_boxes().values():
        result[v.terminal_id] = v.to_dict()
    return __valid_response(result)


@app.route("/epg")
def epg():
    for_date = request.args.get('for_date', default='') or datetime.now()
    if isinstance(for_date, str):
        for_date = datetime.fromisoformat(for_date)
    my_epg = fetchtv.get_epg(for_date)
    results = []
    epg_channels = sorted(fetchtv.epg_channels.values(), key=lambda x: x.name)
    for epg_channel in epg_channels:
        if str(epg_channel.id) not in my_epg.keys():
            continue
        results.append({
            'channel': epg_channel.to_dict(),
            'regionIds': epg_channel.regions,
            'regions': [region.to_dict() for region in fetchtv.epg_regions.values()
                        if int(region.id) in epg_channel.regions],
            'programs': [{**prog.to_dict(), **{'epg_channel_id': str(epg_channel.id)}}
                         for prog in my_epg[str(epg_channel.id)]]
        })
    return __valid_response(results)


@app.route("/epg_regions")
def epg_regions():
    result = is_not_connected()
    if result:
        return result
    result = [region.to_dict() for region in fetchtv.epg_regions.values()]
    return __valid_response(result)


@app.route("/current_program")
def current_program():
    box_id = request.args.get('box_id', default='')
    if not box_id:
        return __error_response('box_id is a mandatory parameter', 400)
    response = flask.jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')
    if is_not_connected():
        return response
    my_boxes = [box for box in fetchtv.get_boxes().values() if box.terminal_id == box_id]
    if len(my_boxes) == 0:
        return response
    box = my_boxes[0]
    result = box.get_current_program()
    return __valid_response(result.to_dict() if result else {})


@app.route("/find_program")
def find_program():
    program_name = request.args.get('name', default='')
    if not program_name:
        return __error_response('name is a mandatory parameter', 400)
    response = flask.jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')
    if is_not_connected():
        return response
    matches = fetchtv.find_program(program_name)
    for match in matches:
        match['program'] = match['program'].to_dict()
    return __valid_response(matches if matches else {})


@app.route('/<path:filename>')
def serve_static(filename):
    return flask.send_from_directory("./", filename)


@app.route("/send_remote_key")
def send_remote_key():
    remote_key = request.args.get('remote_key', default='')
    terminal_id = request.args.get('terminal_id', default='')
    if not remote_key or not terminal_id:
        return __error_response('remote_key and terminal_id are mandatory parameters', 400)
    box = fetchtv.get_box(terminal_id)
    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)
    if remote_key not in set(item.name for item in RemoteKey):
        return __error_response('Remote key is not recognised', 422)
    if remote_key == RemoteKey.Record.name:
        program = box.get_current_program()
        box.record_program(RecordProgramParameters(
            channel_id=box.state.channel_id,
            program_id=program.program_id,
            epg_program_id=program.epg_program_id))
    else:
        box.send_key(RemoteKey[remote_key])
    return __valid_response({'result': 'key sent'})


@app.route("/dvb_channels")
def dvb_channels():
    result = is_not_connected()
    if result:
        return result
    for box in fetchtv.get_boxes().values():
        result = {k: v.to_dict() for k, v in box.dvb_channels.items()}
        break
    response = Response(
        response=json.dumps(result),
        status=200,
        mimetype='application/json'
    )
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response
    

@app.route("/change_channel")
def change_channel():
    terminal_id = request.args.get('terminal_id', default='')
    channel_id = request.args.get('channel_id', default='')
    if not channel_id or not terminal_id:
        return __error_response('channel_id and terminal_id are mandatory parameters', 400)
    box = fetchtv.get_box(terminal_id)
    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)
    box.play_channel(channel_id)
    return __valid_response({'result': 'channel changed'})


@app.route("/cancel_recording")
def cancel_recording():
    terminal_id = request.args.get('terminal_id', default='')
    program_id = request.args.get('program_id', default='')
    if not program_id or not terminal_id:
        return __error_response('program_id and terminal_id are mandatory parameters', 400)
    box = fetchtv.get_box(terminal_id)
    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)
    box.cancel_recording(program_id)
    return __valid_response({'result': 'recording cancelled'})


@app.route("/cancel_series")
def cancel_series():
    terminal_id = request.args.get('terminal_id', default='')
    program_id = request.args.get('program_id', default='')
    series_link = request.args.get('series_link', default='')
    if not terminal_id or not series_link:
        return __error_response('series_link and terminal_id are mandatory parameters', 400)
    box = fetchtv.get_box(terminal_id)
    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)
    box.cancel_series(program_id, series_link)
    return __valid_response({'result': 'series cancelled'})


@app.route("/record_series")
def record_series():
    program_id = request.args.get('program_id', default='')
    series_link = request.args.get('series_link', default='')
    epg_program_id = request.args.get('epg_program_id', default='')
    epg_channel_id = request.args.get('epg_channel_id', default='')

    if not series_link or not program_id or not epg_program_id:
        return __error_response('series_link, program_id, epg_program_id are mandatory parameters', 400)
    box = [box for box in fetchtv.get_boxes().values()][0]

    # find matching dvb channel
    channels = [channel for channel in box.dvb_channels.values() if str(channel.epg_id) == epg_channel_id]
    if len(channels) == 0:
        return __error_response('Unable to determine channel for epg_channel_id: ' + epg_channel_id, 422)
    channel_id = str(channels[0].id)

    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)
    box.record_series(
        RecordSeriesParameters(
            series_link=series_link,
            channel_id=channel_id,
            epg_program_id=epg_program_id,
            program_id=program_id))
    return __valid_response({'result': 'series linked'})


@app.route("/record_program")
def record_program():
    epg_program_id = request.args.get('epg_program_id', default='')
    program_id = request.args.get('program_id', default='')
    epg_channel_id = request.args.get('epg_channel_id', default='')
    if not epg_channel_id or not epg_program_id or not program_id:
        return __error_response('epg_channel_id, epg_program_id and program_id are mandatory parameters', 400)
    box = [box for box in fetchtv.get_boxes().values()][0]
    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)
    channel_ids = [channel.id for channel in box.dvb_channels.values()
                   if str(channel.epg_id) == epg_channel_id]
    box.record_program(RecordProgramParameters(
        channel_id=channel_ids[0],
        program_id=program_id,
        epg_program_id=epg_program_id))
    return __valid_response({'result': 'program recording'})


@app.route("/delete_recording")
def delete_recording():
    terminal_id = request.args.get('terminal_id', default='')
    recording_id = request.args.get('recording_id', default='')
    if not recording_id or not terminal_id:
        return __error_response('recording_id and terminal_id are mandatory parameters', 400)
    box = fetchtv.get_box(terminal_id)
    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)
    box.delete_recordings([int(recording_id)])
    return __valid_response({'result': 'recording deleted'})


@app.route("/download")
def download():
    terminal_id = request.args.get('terminal_id', default='')
    recording_id = request.args.get('recording_id', default='')
    if not recording_id or not terminal_id:
        return __error_response('recording_id and terminal_id are mandatory parameters', 400)
    box = fetchtv.get_box(terminal_id)
    if not box:
        return __error_response('No such Box matching the provided terminal_id', 422)

    if int(recording_id) not in box.recordings.items.keys():
        return __error_response('Recording not found', 422)
    recording = box.recordings.items[int(recording_id)]

    url = recording.dlna_url
    filename = str(recording.name)
    if recording.episode:
        filename += f" - S{recording.season}E{recording.episode}"
    elif recording.season:
        filename += f" ({recording.season})"
    if recording.episode_title:
        filename += f" - {recording.episode_title}"
    filename = create_valid_filename(filename)

    req = requests.get(url, stream=True)
    logger.info(req.headers['content-length'] + ', ' + req.headers['content-length'])
    return Response(stream_with_context(req.iter_content(8192)), content_type=req.headers['content-type'], headers={
        # 'content-length': str(int(req.headers['content-length']) + 1024)
        'content-disposition': 'filename="' + filename + '"'
    })


@app.route("/active_recordings")
def active_recordings():
    terminal_id = request.args.get('terminal_id', default='')
    result = []
    for box in fetchtv.get_boxes().values():
        if terminal_id and terminal_id != box.terminal_id:
            continue
        for recording in box.recordings.future.values():
            result.append(recording.to_dict())
    return __valid_response(result)


@app.route("/series_recordings")
def series_recordings():
    terminal_id = request.args.get('terminal_id', default='')
    result = []
    for box in fetchtv.get_boxes().values():
        if terminal_id and terminal_id != box.terminal_id:
            continue
        for series in box.recordings.series:
            item = series.to_dict()
            item['terminal_id'] = box.terminal_id
            result.append(item)
    return __valid_response(result)


@app.route("/recordings")
def recordings():
    result = []
    for box in fetchtv.get_boxes().values():
        for recording in box.recordings.items.values():
            if recording.size != 0:
                result.append(recording.to_dict())
    return __valid_response(result)


if __name__ == "__main__":
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path)

    with FetchTV(ping_sec=30) as fetchtv:
        if not fetchtv.login(os.environ.get('ACTIVATION_CODE'), os.environ.get('PIN')):
            logger.error('Login to FetchTV failed, check activation code and pin are correct.')
        else:
            app.run(host='0.0.0.0', port=5001)
