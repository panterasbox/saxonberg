inherit MonsterAsk;
inherit MonsterTalk;
#include "../defs.h"

string lesson = "Are we ready to learn?  OK then.  Today's "
"lesson is about aliases and subs.  Let's start with aliases.  "
"Aliases are one word custom commands you can make to make " 
"mudding easier for you.  You can alias a complicated, "
"mutli-word command into one easy to remember command.  "
"For example:\n\n" 
"alias tp tell peaches\n\n" 
"Now when you type:\n\n" 
"tp hey can I please have an unkill?\n\n" 
"It is the same as if you had typed:\n\n" 
"tell peaches hey can I please have an unkill?\n\n\n"
"Ask me about subs to see the rest of the lesson.";

string more = "\n"
"Subs are similar in that you can use them to simplify "
"your mud life by making things easier to type.  Say a buddy "
"of yours on the mud has chosen the name 'Xiasdlkd.'\n\n"
"You can type:\n\n"
"sub buddy xiasdlkd\n\n" 
"and now whenever you type 'buddy' the mud will recognize it as "
"'xiasdlkd.'  For example:\n\n"
"tell buddy hey what's up?\n\n"
"Would be the same as if you had typed:\n\n"
"tell xiasdlkd hey what's up?\n\n" 
"You can also type 'sub' or 'alias' alone to see a list of "
"your aliases or subs.  Any questions?  I didn't think so.  "
"But if you happen to forget, you can always type 'help alias' "
"or 'help sub'.";

void extra_create()
{
   
   set_name( "teacher" );
   add_alias( ({"teacher", "Mr. Walsh", "mr. walsh", "walsh", "Walsh",
    "Mr. walsh", "monster"}) );
   set_short( "Mr. Walsh" );
   set_long(
      "This is Mr. Walsh.  He's a no-nonsense kind of guy, but everyone "
      "says he's a great teacher.  He stands in front of the classroom, "
      "ready to teach.  You've heard rumors that he knows a bit about "
      "<aliases>, perhaps you should ask him about it.");
   set_race( "human" );
   
   set_chat_rate( 30 );
   set_chat_chance( 75 );
   add_phrase( "Mr. Walsh says: Ask me about aliases" );
   add_phrase( "Mr. Walsh peers around the classroom." );
   
   ask_me_about( "aliases", "#say "+lesson );
   ask_me_about( "subs", "#say "+more );
}

