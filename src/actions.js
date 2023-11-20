import { Regex } from '@companion-module/base'

var PD_POWER_STATES = {
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
			name: 'Set On',
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
				//instance.setState(event.options.device, '.1.3.6.1.4.1.40595.1.1.2.0', event.options.state)

				/*try {
					var pd = NECPD.open(read_ip());
					var monitor_id = 1;
					pd.helper_set_destination_monitor_id(monitor_id);
					try {					
						if (event.options.state == 0) {
							pd.command_power_status_set(PD_POWER_STATES['Off']);
						}
						if (event.options.state == 1) {
							pd.command_power_status_set(PD_POWER_STATES['On']);
						}
						
						setTimeout(function() {
							pd.close();
						}, 1000);
					} finally {
						pd.close();
					}
				} catch (PDError) {
					instance.log("PDError:", PDError);
				}*/
			},
		}
	}
}