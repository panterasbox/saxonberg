//
// Porta-Board w/SECURITY
//
// created 3 July 1993
//

inherit "/usr/anthrax/nymph/pboard";

//  This is an override of the default func to provide security.

int 	remove_message(string str)		// called by player
{
	string	s1, s2;		//temp vars
	int	num;

	if (sscanf(str, "%d", num) != 1) {
	   write("Usage:  remove <number>\n");
	   return(1);
	   }
	if (num < 1 || num > sizeof(headers)) {
	   write("Message out of range!\n");
	   return(1);
	   }
	if(!IsWizard(THISP))
		{
		write("Only a wizard may remove messages.\n");
		return 1;
		}
	THISO->rm_message(num);
	write("You remove message number "+num+".\n");
	say(PNAME+" removes a message from the board.\n", ({THISP}));
	return(1);
}
