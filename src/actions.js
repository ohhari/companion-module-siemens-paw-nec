import { Regex } from '@companion-module/base'

export default function (instance) {
	return {
		//Action to set a device state
		setState: {
			name: 'Set State',
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
				instance.log('debug','Set state of Device ' + event.options.device + ' to ' + event.options.state)
				instance.setState(event.options.device, '.1.3.6.1.4.1.40595.1.1.2.0', event.options.state)
			},
		},
		//Action to get a state of a device
		getState: {
			name: 'Get State',
			options: [
				{
					type: 'textinput',
					label: 'Get State from Device',
					id: 'device',
					default: '',
					tooltip: 'Set Device IP',
					width: 8,
					regex: Regex.IP,
				},
			],
			callback: async (event) => {
				instance.log('debug','Get state from Device ' + event.options.device)
				instance.getState(event.options.device, '.1.3.6.1.4.1.40595.1.1.2')
			},
		},
	}
}