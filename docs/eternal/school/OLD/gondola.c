inherit RoomPlusCode;
#define SERVER "/zone/null/eternal/school/BalServer"
object balloon;

void extra_create()
{
    set("short","Inside the Gondola");
    set("day_long",
      "You are sitting inside the wicker gondola of the Eternal "
      "County Public School Hot Air Balloon."
    );
    set("reset_data",([
	"pilot":"/zone/null/eternal/school/pilot",
	"lever":"/zone/null/eternal/school/lever",
      ]) );
    if(FINDO("/zone/null/eternal/school/BalServer"))
	FINDO("/zone/null/eternal/school/BalServer")->set_gondola(THISO);
    if(!balloon&&sizeof(find_objects("zone/null/eternal/school/balloon"))>1)
	balloon=find_objects("zone/null/eternal/school/balloon")[1];
}  

void extra_init()
{
    add_action("do_climb","climb");
    add_action("do_look","look");
}

status do_climb(string str)
{
    if(str!="out")return 0;
    tell_room(THISO,PNAME+" climbs out of the gondola.\n",({THISP}));
    tell_object(THISP,"You climb out of the gondola.\n");
    move_object(THISP,query("bleah"));
    THISP->glance();
    tell_room(query("bleah"),PNAME+" climbs out of the gondola of the balloon.\n",({THISP}));
    return 1;
}

int do_look(string str)
{
    if(str!="off"&&str!="out")
	return 0;
    tell_object(THISP,"Outside the balloon, you see:\n");
    move_object(THISP,ENV(balloon));
    THISP->glance();
    move_object(THISP,THISO);
    return 1;
}

status set_balloon(object ball)
{
    balloon=ball;
    present_path("/zone/null/eternal/school/lever")->set_balloon(ball);
    return 1;
}
