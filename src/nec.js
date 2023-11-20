/*nec_pd_sdk.py - High level functions for communicating via LAN or RS232 with NEC large-screen displays.
Copyright (C) 2016-18 NEC Display Solutions, Ltd
written by Will Hollingworth <whollingworth at necdisplay.com>
See LICENSE.rst for details.
Code from https://github.com/NECDisplaySolutions/necpdsdk*/

//import socket
export class NECPD {
    reply_message_type = 0
    reply_destination_address = 0

    __init__(this, f) {
        this.f = f
        this.destination_address = 0x41
    }

    open(cls, address) {
        /*
        Build a NECPD from an ip address or port. Try and determine if the address
        is an IP address or com port and open appropriately.
        :param address: IP address or serial port name to open
        */
        try {
            socket.inet_aton(address)
            return cls.from_ip_address(address)
        } catch (error) {//socket.error) {
            return cls.from_com_port(address)
        }
    }

    set_destination_address(this, address){
        /*
        Sets the destination address (Monitor ID) for all messages.
        :param address: the "raw" value of the destination address (Monitor ID) sent with each command
        */
        instance.log('debug','address=%02xh', address)
        //print("set_destination_address: ", hex(address))
        assert ((0x41 <= address <= 0xA4) || (0x31 <= address <= 0x3A) || address == 0x2A)
        this.destination_address = address
    }

    close(this) {
        /*
        Closes socket.
        */
        instance.log('debug','closing port')
        if (this.f!= None) {
            this.f.close()
        }
    }
    /*command_power_status_read(self):
        *
        Reads the current power state of the display.

        :return: state value
        *
        logging.debug('')
        send_data = []
        send_data.extend(ascii_encode_value_4_bytes(0x01D6))
        write_command(self.f, send_data, self.destination_address, 0x41)
        reply_data, reply_message_type, reply_destination_address = read_command_reply(self.f, True)
        if len(reply_data) == 16:
            if reply_message_type != 0x42:
                logging.error('unexpected reply received')
                raise unexpectedReply
            # result code and power control reply command
            if reply_data[0:4] != ascii_encode_value_4_bytes(0x0200):
                logging.error('unexpected reply received')
                raise unexpectedReply
            if reply_data[4:8] != ascii_encode_value_4_bytes(0xD600):
                logging.error('unexpected reply received')
                raise unexpectedReply
            # value parameter
            state = ascii_decode_value(reply_data[12:12+4])
        else:
            logging.error('unexpected reply length: %i (expected 16)', len(reply_data))
            raise unexpectedReply
        return state*/

    command_power_status_set(this, state){
        /*
        Sets the power state of the display.
        :param state:
        :return: state value (same as input parameter - i.e. not updated if the display changes state)
        */

        //assert 1 <= state <= 4
        logging.debug('state=%i', state)
        send_data = []
        send_data.extend(ascii_encode_value_2_bytes(0xC2))
        send_data.extend(ascii_encode_value_4_bytes(0x03D6))
        send_data.extend(ascii_encode_value_4_bytes(state))
        write_command(this.f, send_data, self.destination_address, 0x41)
        reply_data, reply_message_type, reply_destination_address = read_command_reply(self.f, True)
        if (len(reply_data) == 12) {
            /*if (reply_message_type != 0x42) {
                instance.log('error','unexpected reply received')
                //raise unexpectedReply
            }
            // result code and power control reply command
            if (reply_data[0:4] != ascii_encode_value_4_bytes(0x00C2)) {
                instance.log('error','unexpected reply received')
                //raise unexpectedReply
            }
            if (reply_data[4:8] != ascii_encode_value_4_bytes(0x03D6)) {
                instance.log('error','unexpected reply received')
                //raise unexpectedReply
            }*/
            // value parameter
            //state = ascii_decode_value(reply_data[8:8 + 4])
        } else {
            logging.error('unexpected reply length: %i (expected 12)', len(reply_data))
            //raise unexpectedReply
        }
        return state
    } 
    

    helper_set_destination_monitor_id(instance, monitor_id) {
        /*
        Helper function to set the Monitor ID.
        :param monitor_id: Can be specified as a number in the range 1-100, or "All", or "A"-"J" for a group
        :return:
        */

        let address = 0
        try {
            value = int(monitor_id)
            if (1 <= value <= 100) {
                address = 0x41 + value - 1
            } else {
                //assert 0
            }
        } catch (ValueError) {
            if (monitor_id.lower() == "all") {
                address = 0x2a
            } else if (len(monitor_id) == 1 & ("a" <= monitor_id.lower() <= "j")) {
                address = ord(monitor_id.lower()[0]) - 0x61 + 0x31
            } else {
                //assert 0
            }
        }
        this.set_destination_address(address)
    }
}