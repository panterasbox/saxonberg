#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;
#define LOT ROOMS+"parking_lot"

void extra_create()
{
    set("short","Eternal County Highway 72");
    set("day_long",
      "This is one of the more widely used Eternal County Highways.  "
      "It's four lanes wide, and it could use even two more.  "
      "There are no stop lights or stop signs, and the speed limit, "
      "recently deregulated by the Eternal Cabal Senate, is 75 mph.  "
      "Why are you walking on this road?"
    );
    set("day_light",BRIGHT);
    set("exits",
      ([
	"lot":ROOMS+"parking_lot",
      ]) );
    set("descs",([
	({"road","highway"}):
	"This road appears to be well-used.  There are dark strips "
	"that run up and down where worn off tire rubber has "
	"gathered.",
      ]) );
   set(OutsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);

}

void extra_init()
{
    if(THISP)call_out("runOver",random(6)+3,THISP);
}

status runOver(object roadkill)
{
    string nom, *wot, car;
    if(!present(roadkill))return 1;
    if(roadkill->query_ghost())return 1;
    wot=({"truck","VW Bug","VW Van","Eternal City Bus","Lamborghini Diablo",
      "grey sedan","EotL School bus","steamroller","M1A1 Abrams main battle "
      "tank", "herd of elephant","moped","popemobile","lime green Ford Pinto",
    });
    nom=roadkill->query_name();
    car=wot[random(sizeof(wot))];
    switch(random(5))
    {
    case 0 :
	write(strformat("A passing "+car+" smashes into you, sending you "
	   "flying out of the room barely clinging to your life!"));
	tell_room(THISO,strformat(nom+" is smashed by a passing "+car+"!"),
	   ({roadkill}));
	if(roadkill->query_resting())roadkill->do_stand();
		roadkill->take_damage((roadkill->query_hp()-1),0,"blunt",THISO);
	move_object(roadkill,LOT);
	roadkill->glance();
	tell_room(LOT,strformat(nom+"'s broken, deformed body hurtles onto the "
	   "lot and rolls to a stop!"),({roadkill}));
	break;
    case 1 :
	write(strformat("You're grazed by a passing "+car+"!"));
	tell_room(THISO,strformat(nom+" is grazed by a passing "+car+"!"),
	   ({roadkill}));
	roadkill->take_damage((roadkill->query_hp()/2),0,"blunt",THISO);
	tell_room(LOT,strformat(
	    "You hear a thud and a scream of pain from the road that sounds "
	    "oddly like "+nom+"."));
	call_out("runOver",random(4)+1,roadkill);
	break;
    case 2 :
	write(strformat("You shriek in fear as a "+car+" nearly flattens you!"));
	tell_room(THISO,strformat(nom+" shrieks in fear as a "+car+" nearly "
	   "flattens "+objective(roadkill)+"!"),({roadkill}));
	tell_room(LOT,strformat("You hear a shriek from the road that sounds oddly "
	   "like "+nom+"."));
	call_out("runOver",random(4)+1,roadkill);
	break;
    case 3 :
	write(strformat("A passing "+car+" smashes into "
	    "you and throws you off the road!"));
	tell_room(THISO,strformat("A passing "+car+" smashes into "+nom+" and "
	   "throws"+objective(roadkill)+" off the road!"),({roadkill}));
	roadkill->take_damage((roadkill->query_hp()-5),0,"blunt",THISO);
	move_object(roadkill,LOT);
	roadkill->glance();
	tell_room(LOT,strformat(nom+"'s bruised and battered body hurtles onto the "
	   "lot and rolls to a stop!"),({roadkill}));
	break;
    case 4 :
	write(strformat("The breeze from a passing "+car+" in "
	    "the other lane knocks you off your feet!"));
	tell_room(THISO,strformat(nom+" is knocked off "+possessive(roadkill)+
	   " feet by the breeze from a passing "+car+"!"),({roadkill}));
	if(!roadkill->query_resting())roadkill->do_rest();
	call_out("runOver",random(3),roadkill);
	break;
    }
    return 1;
}

string exit_message(string dir)
{
    return ("towards the parking "+dir);
}
