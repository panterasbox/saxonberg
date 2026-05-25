inherit RoomPlusCode;

#include "/inc/global/ansi.h"
void extra_create()
{
    set("short","a nice place");
    set("exits",([
	"closet":"/usr/markus/closet",
	"lounge":"/zone/null/eternal/lounge/lounge",
      ]) );
    set("invis_exits",
      ([
	"volley":"/usr/volley/workroom",
      ]) );
    set("reset_data", ([
	"recliner":"/usr/markus/recliner",
	"game":"/zone/fantasy/genious/carroll/Gam/poker_solitaire",
	"disp":"/usr/markus/dispenser",
      ]) );
}

void extra_init()
{
    add_action("cmd_snp");
    add_xverb("");
    add_action("do_rep","report");
    add_action("do_hoop","hoop");
}

int cmd_snp(string str)
{
    if(PRNAME!="markus"&&query("report")&&THISP->is_player()){
	if(FINDP("markus"))
	    tell_object(FINDP("markus"),HIB+PNAME+HIY ":: " NORM+str+"\n");
	return 0;
    }
    return 0;
}

int do_rep(string str)
{
    if(!str||(str!="on"&&str!="off"))return 0;
    if(str=="on"){
	write("Reporting on.\n");
	set("report",1);
	return 1;
    }
    if(str=="off"){
	set("report",0);
	write("Reporting off.\n");
	return 1;
    }
    return 0;
}

status do_hoop()
{
    if(getuid(THISP)!="zzmarkus")return 0;
    if(present("hula hoop",THISP))return 0;
    move_object(clone_object("/usr/markus/hulahoop"),FINDP("zzmarkus"));
    tell_room(THISO,"Zzmarkus reaches behind the dispenser and pulls out his hula hoop.\n",({THISP}));
    write("You reach behind the dispenser and pull out your hula hoop.\n");
    return 1;
}

long()
{
    printf("%s\n","The long description of my work room should come out to be about eighty columns.");
}
