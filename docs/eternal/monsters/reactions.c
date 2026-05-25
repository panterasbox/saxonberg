// reaction.c module
// by yertle@eotl
// created 7/9/93
// last mod 7/14/93

// This bit of code, when inherited from any monster using ask_me.c,
// will respond according to the strings affectionate_response and
// aggressive_response (see ask_me.doc for code examples) when this 
// monster is acted upon by a player with any of the verbs below.

#define affectionate_actions    ({ "bow", "curtsy", "embrace", "kiss", \
				   "laugh", "wink", "snuggle", "smile" })
#define aggressive_actions      ({ "punch", "kick", "slap", "pinch", \
				   "spank", "knee", "flail" })


string  affectionate_response;  // if left uninitialized, process_response
string  aggressive_response;    //  will do nothing, so be sure to set 
				//   these in your monster.

// this func must be called from your monster's extra_init
void    init_reactions()
{
	int i;
	for (i=0; i<sizeof(affectionate_actions); i++)
	   add_action("do_affectionate_response", affectionate_actions[i]);
	for (i=0; i<sizeof(aggressive_actions); i++)
	   add_action("do_aggressive_response", aggressive_actions[i]);
}

status	do_affectionate_response(string str)
{
	if (!str) return(0);                    // non-directed action
	if (!(THISO->id(str))) return(0);       // not directed at me
	
	// if we've reached this point, a player has typed an action
	// defined in one of the above arrays, and has directed that
	// action towards us.

	THISO->process_response(affectionate_response);
	return(0);
}

status	do_aggressive_response(string str)
{
	if (!str) return(0);              
	if (!(THISO->id(str))) return(0); 

	THISO->process_response(aggressive_response);
	return(0);
}

/** SETS/QUERIES **********************************************************/

void    set_affectionate_response(string str)
{
	affectionate_response = str;
}

void    set_aggressive_response(string str)
{
	aggressive_response = str;
}
