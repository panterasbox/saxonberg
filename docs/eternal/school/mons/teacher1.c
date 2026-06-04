inherit MonsterAsk;
#include "../defs.h"

string lesson = "Today's lesson is the 'set' command.  "
"You can use the 'set' command to change some of the aspects "
"of your environment.  The 'set' command alone will list the "
"variables you can change.  Ask me about list for a partial list "
"of these variables and what they mean.";

string list = 
" \n ansi          (on|off) -- This enables or disables support of ansi "
"color throughout EotL.\n"
" \n ansi-shorts   (on|off) -- This enables or disables the coloring of "
"room shorts (e.g. 'The Heart of Eternal City').  Not all rooms have ansi shorts.\n "
" \n ansi-longs    (on|off) -- Same as above, except affects the long "
"descriptions of the rooms.\n"
" \n brief         (on|off) -- This variable will give you an 'Ok.' message "
"when you tell, say, or channel a message rather than telling you what you said.\n"
" \n chnotify      (on|off) -- Enabled, this variable notifies you when "
"players leave or join the various communication channels you are listening to.\n"
" \n Ask me about <more> to see more examples.";

string more = 
" \n room-brief    (on|off) -- With this variable on, you will only see the "
"short descriptions of rooms you enter.\n"
" \n expand        (on|off) -- This variable will tell you the full command "
"you used when you use an alias.\n"
" \n hit-level  (low|middle|high|random) -- This sets the area of the target "
"that you will attack most often.\n"
" \n hpw           (on|off) -- This allows you to track your hit points, mana "
"and fatigue as they decrease in combat.\n"
" \n Ask me about rest to see the rest of the lesson.";

string rest =
" \n title          (title) -- This allows you to set the phrase that follows "
"your name.  You can only set your title once your eval is 50 or higher.\n"
" \n wimpy    (0-100|brave) -- Wimpy allows you to automatically flee from "
"combat when your hit points fall below a certain percentage.  The higher you "
"set your wimpy, the sooner you'll flee.\n"
" \n wimpydir  (dir|random) -- This allows you to specify which direction you "
"flee when your wimpy goes off.\n"
" \n wrap          (on|off) -- This variable will help those poor souls whose "
"terminals don't line wrap for them see things that extend beyond the end of "
"their screen.\n"
"\n That's all for this lesson, carry on!";

void extra_create()
{
   
   set_name( "teacher" );
   add_alias( ({"teacher", "Mrs. Martin", "mrs. martin", "martin", "Martin",
    "monster"}) );
   set_short( "Mrs. Martin" );
   set_long(
      "This is Mrs. Martin.  She is a kindly old lady who is here to help "
      "teach newbies.  She doesn't look like she knows much, but she is "
      "probably well-practiced in what she DOES know, since she's been "
      "teaching this class for as long as anyone can remember.  She has "
      "chalk on her fingers, as if she has written something on the board.");
   set_race( "human" );
   
   ask_me_about( "set", "#say "+lesson );
   ask_me_about( "list", "#say "+list );
   ask_me_about( "more", "#say"+more );
   ask_me_about( "rest", "#say"+rest );
}

