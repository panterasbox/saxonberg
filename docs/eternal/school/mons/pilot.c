inherit MonsterCode;
#include "../defs.h"

#include <ansi.h>
#define BALLOONROOM ROOMS "balloon"

void extra_create()
{
    set_name("balloon pilot");
    add_alias("pilot");
    set_short("EotL School Balloon Pilot");
    set_long(
      "This is the Pilot of the EotL School Balloon.  He is "
      "wearing a deep blue uniform, complete with red pinstripes "
      "and a hat.  His usual posture is seated on a stool, with his "
      "large hand on the lever that controls the balloon.  "
      "His face is drawn and haggard.  His yellowish tinged skin "
      "is stretched over his hollow cheeks, stained from years of "
      "smoking unfiltered Lucky Strikes.  The County won't allow him "
      "to smoke in the balloon, however, so most of the time he is "
      "in a dour mood, jonesing for a butt."
    );
    set_stat("str",100);
    set_stat("con",80);
    set_stat("dex",30);
    set_stat("int",20);
    set_stat("wil",20);
    set_stat("chr",20);
    set_race("human");
    set_gender("male");
    if(clonep())
	call_out("pilot_greet",random(10));
    //move_object(clone_object(OBJ+"parachute"),THISO);
    //command("wear chute");
}

status no_wei_you_turd(object turd, int i)
{
    string mess, nom;
    nom = turd->query_name();
    mess = "Hey there, stupid.  I drive the balloon.  Me, not you.  I drive, "
    "you sit.  You think I like this?  You think I like ferrying you dorks "
    "back and forth, back and forth all day and all night with no "
    "breaks?  You think I wouldn't in an instant give you this job "
    "so that I could sit there and try to pull on your lever?  "
    "Don't you think I'd do that?  I would.  But for now "
    "we live in a capitalistic society and I need money to pay my rent.  "
    "I don't come to where you work and flip burgers for you "
    "so DON'T TOUCH MY LEVER!";
    tell_room(ENV(THISO),nom+" reaches for the lever and the Pilot slaps "
    +possessive(turd)+" "+turd->query_hand_name()+" away!\n",({turd}));
    tell_object(turd,"You reach for the lever and the Pilot slaps your "
    +turd->query_hand_name()+" away!\n");
    ( "/secure/player/commands/say"->do_command(THISO, mess ));
    
   if(i == 0)
   {
      command("pull lever");
      return 1;
   }
   
   command("push lever");
   return 1;
}

status pilot_greet()
{
   "/secure/player/commands/say"->do_command(THISO, "I don't get paid "
      "enough for this lameass job.");
    return 1;
}
