inherit RoomPlusCode;
#include <ansi.h>

void extra_create()
{
    set("short","The EotL Schoolhouse");
    set("day_long",
      "This is the main lesson hall of the EotL schoolhouse.  There "
      "are several rows of small student desks between you and the "
      "front of the room.  At the front of the room stands a large "
      "wooden desk and an immense green chalkboard.  There is a digital "
      "clock and a speaker encased in a wooden box embedded in the wall at the back of the room just "
      "above the door.  There is a passageway in the north wall "
      "to the right of the wooden desk."
    );
    set("day_light",BRIGHT);
    set("exits",([
	"north":"/zone/null/eternal/school/room02",
	"south":"/zone/null/eternal/school/parking_lot",
	"west":"/zone/null/eternal/school/room04",
      ]) );
    set("reset_data", ([
	"dixie":"/zone/null/eternal/school/dixie",
	"board":"/zone/null/eternal/school/chalkboard",
      ]) );
    set("descs", ([
	({"speaker","pa","intercom","wooden box","box"}):
	"This is a stained, wooden box with a hole cut "
	"in the middle.  The hole is filled with a large, black "
	"paper woofer.",
	({"desks","desk"}):
	"The desks look old in style.  They are fashioned out of "
	"black wrought iron and oak and look extremely uncomfortable "
	"and therefore distinctly and perversely conducive to the "
	"educational process.  The graffiti produced by years and years "
	"of students' boredom is etched into the surface of the desk.",
	({"graffiti","graffito"}):
	"@randGraffito",
	({"clock","digital clock"}):
	"@clockCheck",
      ]) );
    call_other("/zone/null/eternal/school/room04","Load_you_fucker");
}

void extra_init()
{
    add_action("do_etch","etch");
    add_action("randGraffito","read");
}

status randGraffito(string foo)
{
    string *graffiti;
    if(query_verb()=="read"&&(foo!="graffito"&&foo!="graffiti"))return 0;
    graffiti=({});
    graffiti=grab_file("/zone/null/eternal/school/lessons/graffiti");
    if(!sizeof(graffiti)){
	write(strformat("The surface of the desk is smooth and clean, "
	    "having recently been sanded down by Miss Dixie."));
	return 1;
    }
    write(strformat(graffiti[random(sizeof(graffiti))],"The graffito reads: "));
    return 1;
}

status clockCheck()
{
    string str;
    str=ClockObject->query("date_s")+" -- "+ClockObject->query("time_12");
    write(strformat(str,"The clock reads: "));
    return 1;
}

status do_etch(string str)
{
    object wep;
    string *foo;
    foo=grab_file("/zone/null/eternal/school/lessons/graffiti");
    if(!wep=THISP->query_weapon()){
	write("You aren't wielding anything to etch with.\n");
	return 1;
    }
    if(wep->query("type")!="edged"){
	write("You'll have a tough time etching anything with that "+
	  wep->query("type")+" weapon.\n");
	return 1;
    }
    if(wep->query("sharpness")<5){
	write("Your "+wep->query("id")[0]+" is too dull to etch with.\n");

	return 1;
    }
    if(invalid_string(str)){
	write("You can't etch invalid characters.\n");
	return 1;
    }
    if(!str)return 0;
    if(present("dixie")&&random(sizeof(foo))>20){
	string mess;
	mess="Oh my!  What is this?  This is just unacceptable, "+PNAME+"!  "
	"Vandalizing school property is grounds for suspension!"; 
	tell_room(THISO,PNAME+" starts to etch something onto "+possessive(THISP)+" desk.\n",({THISP}));
	tell_object(THISP,"You start to etch onto the desk.\n");
	tell_room(THISO,strformat(mess,"Miss Dixie says: "));
	tell_room(THISO,"Miss Dixie kicks "+PNAME+" out of school!\n",({THISP}));
	THISP->set("suspended",time());
	tell_object(THISP,"Miss Dixie kicks you out of school!\n");
	move_object(THISP,"/zone/null/eternal/school/parking_lot");
	THISP->glance();
	tell_room(THISO,"Miss Dixie takes out a power sander and cleans off "+PNAME+"'s desk.\n");
	rm("/zone/null/eternal/school/lessons/graffiti");
	return 1;
    }
    write(strformat("You etch \""+str+"\" onto the surface of the desk."));
    tell_room(THISO,PNAME+" etches something onto "+possessive(THISP)+" desk!\n",({THISP}));
    write_file("/zone/null/eternal/school/lessons/graffiti",str+"\n");
    wep->set("sharpness",(wep->query("sharpness"))-1);
    return 1;
}

void do_pa(string msg)
{
    object *stuff;
    int i;
    stuff=all_inventory(THISO);
    stuff=filter_array(stuff,#'interactive);
    i=sizeof(stuff);
    while(i--)
    {
	tell_object(stuff[i], strformat( msg,
	    (stuff[i]->query_ansi() ?
	      HIR+"The intercom whines: "+NORM :
	      "The intercom whines: ")));
    }
}
