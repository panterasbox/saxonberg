inherit MonsterAsk;
inherit MonsterTalk;
#include "../defs.h"

string lesson = "Channels are a wonderful method of communicating "
"with mortals and immortals alike.  The number of "
"channels on EotL changes with the whims of those "
"in charge, but you can access a current list of "
"all the channels you have access to by typing "
"'channel.'\n\n Ask me about examples to see some examples.";
 
string examples = "The channel command works as follows:\n\n"
"channel <channel>\n"
"i.e. 'channel gossip'\n"
"This will either join you to a channel, or take you "
"off that channel, if you are currently listening "
"to it.\n\n"
"channel <channel> <message>\n"
"i.e. channel gossip mure causes cancer in lab rats\n\n"
"This will broadcast your nice message over the channel "
"you specify to those who are on the channel.  Emotes "
"can be done over channels by putting either a ; or a ] "
"immediately before the emote name and immediately after "
"the channel name.  For example:\n\n"
"channel gossip ;booga bauhaus\n"
"would produce the following result (assuming Bauhaus is "
"on the gossip channel):\n"
"<Gossip> Yourname jumps in front of Bauhaus and screams, "
"\"Booga booga booga!\"\n\n"
"Ask me about commands for some commands you can use with channels.";

string commands = "The following are a few of the commands you can use "
"with channels:\n\n"
"channel <channel> /who\n"
"i.e. 'channel gossip /who'\n" 
"This will produce a list of those who are listening "
"to the channel you specify.\n\n"
"channel <channel> /last\n"
"i.e. 'channel gossip /last'\n"
"This will give you a backlog of what has been said "
"on the channel you specify.\n\n"
"channel <channel> /color color\n"
"i.e. 'channel gossip /color bold red flash\n"
"If you support ANSI colors, this will color the "
"\"prefix\" of the specified channel in the specified "
"color.  More detailed settings can be found in the "
"channel help file.\n\n"
"In fact, more detailed help on channels in general "
"can be found in this file.  So type 'help channel' "
"and become an informed individual.  This concludes today's lesson.";

void extra_create()
{
   enable_commands();
   set_name( "Sister Mary" );
   add_alias( ({"teacher", "nun", "Nun", "Catholic Nun", "Catholic nun",
    "catholic nun", "sister", "sister mary", "Sister Mary", "mary", "Mary",
    "monster"}) );
   set_short( "Sister Mary" );
   set_long(
      "This is Sister Mary.  She's a kindly old lady, but you get the feeling "
      "that if you step out of line, she'd rap your knuckles with a ruler.  "
      "Sister Mary is a good teacher, but she'll only teach if you are willing "
      "to <listen>.");
   set_race( "human" );
   
   set_chat_rate( 30 );
   set_chat_chance( 75 );
   add_phrase( "Sister Mary says: <listen> to me to get your lesson." );
   add_phrase( "Sister Mary sings: Jesus loves me this I know, cuz the Bible "
      "tells me so." );
   add_phrase( "Sister Mary swats at your hands with a ruler." );
   
   listen_for( "listens closely", "#say "+lesson );
   ask_me_about( "examples", "#say "+examples );
   ask_me_about( "commands", "#say "+commands );
}

