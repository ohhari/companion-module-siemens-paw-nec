import { Regex } from '@companion-module/base'

var POWER_STATES = {
    'Error': 0,
    'On': 1,
    'Standby': 2,
    'Suspend': 3,
    'Off': 4,
}

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
					choices: 
						[
							{id: 0, label: 'Off'},
							{id: 1, label: 'On'}
						],
					minChoicesForSearch: 2,
				},
			],
			callback: async (event) => {
				instance.log('info','Set state of Device ' + event.options.device + ' to ' + event.options.state)		
				try {					
					if (event.options.state == 0) {
						instance.setPowerState(POWER_STATES['Off']);
					}
					if (event.options.state == 1) {
						instance.setPowerState(POWER_STATES['On']);
					}
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
					instance.log('info','The state of Device ' + event.options.device + ' is ' + state)
				} catch (err) {
					instance.log('error', 'Connection error: ' + err);
				}
			},
		}
	}
}