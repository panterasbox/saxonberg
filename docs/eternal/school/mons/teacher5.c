inherit MonsterAsk;
inherit MonsterTalk;
#include "../defs.h"

string lesson = " There are various ways of communicating on EotL.  You can say, "
"tell, whisper, channel, shout, and emote. \n\n"
"This lesson will cover everything but channels.\n\n"
"When you use the command 'say bogleg!' (or <'bogleg!> which is "
"effectively the same) everyone in the room where you use the "
"command will see the following: %s says: bogleg! \n\n"
"Ask me about tell for the next part of the lesson.";
 
string tell = " The tell command allows you say something to a specific "
"player who is not necessarily in the same room as you "
"in the following manner: 'tell hodge pleeze frob me!!'  \n"
"This command will tell the player Hodge, assuming that he's "
"online and not net-dead, '%s tells you: pleeze frob me!!'\n\n"
"At a certain point, you will hear shouts.  Shouts are messages "
"generally produced by wizards that the whole mud can hear.  "
"Mortals, with a few rare exceptions, cannot shout.\n\n"
"Ask me about reply for part 3.";


string reply = " You may also use the 'reply' to send a tell to the last person "
"who told you.  For example...\n\n"
"Hodge tells you: No, I will not frob you.  Ever.  Leave me alone.\n"
"reply aww cmon i got goods ideas!11~!~!!\n"
"You tell Hodge: aww cmon i got goods ideas!11~!~!!\n\n"
"Also, if you substitute a '.' for the player's name, you will "
"send a tell to the last person you told.  For example...\n\n"
"tell hodge y r u mad at me???\n"
"You tell Hodge: y r u mad at me???\n"
"tell . i'm sorry, pleeeze frob me????\n"
"You tell Hodge: i'm sorry, pleeze frob me????\n\n"
"Ask me about grouptell for part 4!";

string grouptell = " The tell command can be used to tell multiple targets by "
"typing 'tell player1, player2, player3 message'\n"
"For example...\n\n"
"tell markus, hodge, devo whos in charge here?//???\n"
"You tell Markus, Hodge, and Devo: whos in charge here?//???\n\n"
"When replying to a group message, 'reply message' replies "
"to everyone who received the message.  For example...\n\n"
"Hodge tells you, Devo, Crisis, and Peaches: what's up?\n"
"reply not much, you?\n"
"You tell Hodge, Devo, Crisis, and Peaches: not much, you?\n\n"
"Ask me about emotes for the final part of this lesson.";

string emotes = " Whisper is similar to tell, in that people in the same room "
"will not see the message.  However, they will see that you are "
"whispering something.  The format is: 'whisper player message'\n"
"For example...\n\n"
"whisper Peaches your my favoreet wizzie!\n"
"You whisper to Peaches: your my favoreet wizzie!\n"
"Other people in the room with you will see:\n"
"%s whispers something to Peaches.\n\n"
"Emotes, or feelings, are used to convey feelings on the mud.  "
"EotL has over 1100 predefined emotes and that number is increasing "
"rapidly.  They are used by typing the name of the emote (to "
"get a full list of emotes, type 'feelings').  For example...\n"
"Typing 'grin' will produce the message '%s grins.' to "
"the room you are currently in.  You may also customize certain "
"feelings.  'grin happily' will produce the message '%s "
"grins happily.' in the room you are in.  Type 'help <emote>' "
"to find out more about specific emotes.  If you can't find the "
"emote you want among those already defined, you may type "
"'emote <emote>' to produce the feeling you desire.  For "
"example, 'emote fribbles!' will produce the message '%s "
"fribbles!' in the room you are in.  To get a list of emotes with a "
"certain word in them, use the 'findemote' command.  For example, "
"'findemote grin' will show you all of the emotes with the word "
"\"grin\" in them.";

void extra_create()
{
   enable_commands();
   set_name( "Sister Rose" );
   add_alias( ({"teacher", "nun", "Nun", "Catholic Nun", "Catholic nun",
    "catholic nun", "Sister Rose", "sister rose", "Rose", "rose", "Sister",
    "sister", "monster"}) );
   set_short( "Sister Rose" );
   set_long(
      "This is Sister Rose.  She's a kindly old lady, but you get the feeling "
      "that if you step out of line, she'd rap your knuckles with a ruler.  "
      "Sister Rose is a good teacher, but she'll only teach if you are willing "
      "to <listen>.");
   set_race( "human" );
   
   set_chat_rate( 30 );
   set_chat_chance( 75 );
   add_phrase( "Sister Rose says: <listen> to me to get your lesson." );
   add_phrase( "Sister Rose says: I'm married to Jesus." );
   add_phrase( "Sister Rose swats at your hands with a ruler." );
   
   listen_for( "listens closely", "@DidListen" );
   ask_me_about( "tell", "@DidAsk" );
   ask_me_about( "reply", "@DidAsk" );
   ask_me_about( "grouptell", "@DidAsk" );
   ask_me_about( "emotes", "@DidAsk" );
}

status DidListen() 
{
   string name;
   name=CAP(PRNAME);
   return( "/secure/player/commands/tell"->do_command(THISO, 
      PRNAME+(sprintf(lesson, name)) ));
}

status DidAsk(string arg)
{
   string junk,topic,name; 
   sscanf(arg, "ask %s about %s", junk, topic);
   name=CAP(PRNAME);

   switch(topic)
   {
      case "tell" : 
         return( "/secure/player/commands/tell"->do_command(THISO, 
         name+sprintf(tell, name)) );
      case "reply" : 
         return( "/secure/player/commands/tell"->do_command(THISO, 
         name+sprintf(reply, name)) );
      case "grouptell" : 
         return( "/secure/player/commands/tell"->do_command(THISO, 
         name+sprintf(grouptell, name)) );
      case "emotes" : 
         return( "/secure/player/commands/tell"->do_command(THISO, 
         name+sprintf(emotes, name, name, name, name)) );
      }
   }
