import { Regex } from '@companion-module/base'

const POWER_STATES = [
	{id: 0x00, label: 'Error'},
	{id: 0x01, label: 'On'},
	{id: 0x02, label: 'Standby'},
	{id: 0x03, label: 'Suspend'},
	{id: 0x04, label: 'Off'},
]

const PD_IR_COMMAND_CODES = [
    {id: 0x03, label: 'power'},
	{id: 0x4e, label: 'standby'},
	{id: 0x52, label: 'power_on'},
	{id: 0x17, label: 'vol+'},
	{id: 0x16, label: 'vol-'},
	{id: 0x1b, label: 'mute'},
	{id: 0x65, label: 'dvi1'},
	{id: 0x5b, label: 'dvi2'},
	{id: 0x64, label: 'hdmi1'},
	{id: 0x58, label: 'hdmi2'},
	{id: 0x59, label: 'hdmi3'},
	{id: 0x5a, label: 'hdmi4'},
	{id: 0x66, label: 'displayport1'},
	{id: 0x67, label: 'displayport2'},
]

export default function (instance) {
	return {
		//Action to set a device state
		setState: {
			name: 'Set state',
			options: [
				{
					type: 'textinput',
					label: 'Set Device',
					id: 'device',
					default: '',
					tooltip: 'Set Device IP',
					width: 8,
					regex: Regex.IP,
				},
				{
					type: 'dropdown',
					label: 'to State',
					id: 'state',
					default: '0',
					tooltip: 'Select State',
					choices: POWER_STATES,
					minChoicesForSearch: 2,
				},
			],
			callback: async (event) => {
				instance.log('info','Set state of Device ' + event.options.device + ' to ' + event.options.state)		
				try {					
					const state = await instance.setPowerState(event.options.state, event.options.device);
					instance.log('info','The state of Device ' + event.options.device + ' is set to ' + state)
				} catch (err) {
					instance.log('error', 'Connection error: ' + err);
				}
			},
		},
		//Action to get a device state
		getState: {
			name: 'Get state',
			options: [
				{
					type: 'textinput',
					label: 'Get Device state',
					id: 'device',
					default: '',
					tooltip: 'Set Device IP',
					width: 8,
					regex: Regex.IP,
				},
			],
			callback: async (event) => {
				instance.log('info','Get state of Device ' + event.options.device)		
				try {
					const state = await instance.getPowerState(event.options.device);
					instance.log('info','The state of Device ' + event.options.device + ' is ' + POWER_STATES[state].label)
				} catch (err) {
					instance.log('error', 'Connection error: ' + err);
				}
			},
		},
		//Action to send a code to a device
		sendCode: {
			name: 'Send code',
			options: [
				{
					type: 'dropdown',
					label: 'Send code',
					id: 'code',
					default: '0',
					tooltip: 'Select Code',
					choices: PD_IR_COMMAND_CODES,
					minChoicesForSearch: 2,
				},
				{
					type: 'textinput',
					label: 'to Device',
					id: 'device',
					default: '',
					tooltip: 'Set Device IP',
					width: 8,
					regex: Regex.IP,
				},
			],
			callback: async (event) => {
				instance.log('info','Send code ' + event.options.code + '  to Device ' + event.options.device)		
				try {
					await instance.sendIRCode(event.options.code, event.options.device);
					instance.log('info','Executed Code ' + event.options.code + ' on Device ' + event.options.device)
				} catch (err) {
					instance.log('error', 'Connection error: ' + err);
				}
			},
		}
	}
}