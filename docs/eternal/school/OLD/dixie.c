inherit MonsterCode;
#include "comm.h"

void extra_create()
{
    set_name("Miss Dixie");
    add_alias("dixie");
    add_alias("miss dixie");
    add_alias("teacher");
    add_alias("miss");
    set_short("Miss Dixie the school teacher");
    set_long("This is the EotL school teacher, Miss Dixie.");
    set_gender("female");
    set_race("human");
    call_out("dead_check",4);
}

status grad_mess(object nom)
{
    string mess, ti;
    mess="Congratulations, "+nom->query_name()+"!  You have completed the EotL "
    "Newbie School.  Now you are more or less ready for "
    "real life on EotL.  But always feel free to come back "
    "and visit us here if you want to brush up on your "
    "studies.";
    if(present(nom))
	Say(THISO,mess);
    if(present(nom))nom->set("grad_mess",1);
    switch(nom->query_gender())
    {
    case "unknown" :
	ti="is an EotL School graduate";
	break;
    case "other" :
	ti="is an EotL School graduate";
	break;
    case "male" :
	ti="is an EotL School alumnus";
	break;
    case "female" :
	ti="is an EotL School alumna";
	break;
    }
    nom->set_title(ti);
    return 1;
}

void new_student(object who)
{
    string mess;
    mess="Welcome to school, "+who->query_name()+"!  Please use the \"say\" command "
    "to talk to me and ask for a lesson.  The lessons are numbered and are "
    "listed on the board.";
    Say(THISO,mess);
    mess="So read the board and ask me for a lesson, like \"say I want lesson two\" or \"say i'd like to read number 3 please\".";
    Say(THISO,mess);
}

void extra_init()
{
    add_action("cmd_check");
    add_xverb("");
    add_action("do_parse","say");
    add_action("do_parse","go");
    add_action("do_parse","tell");
    if(THISP->query("gradiated")&&!THISP->query("grad_mess"))
	call_out("grad_mess",random(6),THISP);
    if(THISP->query("new_student")<5)
	call_out("new_student",2,THISP);
}

int do_compare(string *yabbo)
{
    mapping topics;
    int i, res;
    topics=([
      "done":888,"one":1,"two":2,"three":3,
      "four":4, "five":5,"six":6,"seven":7,
      "1":1,"2":2,"3":3,"4":4,
      "5":5,"6":6,"7":7,
      "lesson":8,
    ]);
    i=sizeof(yabbo);
    while(i--)
    {
	if(member(topics,yabbo[i]))
	{
	    res=topics[(yabbo[i])];
	    break;
	}
    }
    if(!res)res=999;
    return res;
} 

status do_parse(string str, int f)
{
    int result;
    string verb, *bog;
    object mike;
    if(!str)return 0;
    if(str=="'")return 0;
    bog=explode(str," ");
    if(query_verb()=="tell"&&!id(bog[0]))return 0;
    verb=query_verb();
    if(verb=="")verb="say";
    if(f)verb="say";
    result=do_compare(bog);
    if(result!=999&&result!=888)
	call_out("do_class",random(5),THISP,verb, result);
    if(result==888)
	call_out("do_erase",random(4));
    if(verb=="tell")bog-=({bog[0]});
    str=implode(bog," ");
    if(mike=present_path("/zone/null/eternal/school/pa",THISP) )
    {
	if(mike->query("pa_on"))
	    mike->pa_announce("FEEDback");
    }
    if(verb=="say")
    {
	Say(THISP,str);
    }
    if(verb=="go")
    {
	tell_room(ENV(THISO),strformat(str,PNAME+" goes: "),({THISP}));
	tell_object(THISP,strformat(str,"You go: "));
    }
    if(verb=="tell")
	tell_object(THISP,strformat(str,"You tell Miss Dixie: "));
    return 1;
}

status cmd_check(string cmd)
{
    int i;
    mixed arr;
    arr=allocate(i = strlen(cmd));
    while(i--)
	arr[i] = cmd[i..i];
    if(sizeof(arr)&&arr[0]&&arr[0]=="'")
    {
	if(sizeof(arr)>1)arr=arr[1 .. sizeof(arr)-1];
	do_parse(implode(arr,""), 1);
	return 1;
    }
    else return 0;
}

status do_expel()
{
    Say(THISO,PNAME+"!  I thought I suspended you!  Get out of here!");
    tell_room(ENV(THISO),strformat(
	"Miss Dixie picks "+PNAME+" up by the scruff of "+possessive(THISP)+" neck and tosses "+objective(THISP)+" out the door!"),({THISP}));
    tell_object(THISP,strformat("Miss Dixie picks you up by the scruff of your neck and throws you out of the classroom!"));
    move_object(THISP,"/zone/null/eternal/school/parking_lot");
    tell_room(ENV(THISP),PNAME+" flies out the school door and rolls to a stop.\n",({THISP}));
    THISP->glance();
    return 1;
}
status do_class(object who, string verb, int less)
{
    string mess;
    object board;
    if(THISP->query("suspended"))
	return do_expel();
    board=present("chalkboard",ENV(THISO));
    mess=read_file("/zone/null/eternal/school/lessons/setup"+less);
    Say(THISO,mess);
    if(board->query("lesson"))tell_room(ENV(THISO),"Miss Dixie erases the chalkboard.\n"); 
    tell_room(ENV(THISO),"Miss Dixie writes something on the chalkboard.\n");
    board->set("lesson",less);
    Say(THISO,"Let me know when you're done.");
    return 1;
}

status do_erase()
{
    object board;
    board=present("chalkboard",ENV(THISO));
    tell_room(ENV(THISO),"Miss Dixie erases the chalkboard.\n");
    tell_room(ENV(THISO),"Miss Dixie writes something on the chalkboard.\n");
    board->set("lesson",0);
    return 1;
}

DeathSequence(killer, cause)
{
    if(killer)
    {
	Say(THISO, killer->query_name()+", you've killed me!  You're suspended!");
	THISP->set("suspended",time());
    }
    tell_room(ENV(THISO),strformat(
	"With her last, dying breath, Miss Dixie erases the board and writes "
	"her final lesson."));
    present("chalkboard")->set("lesson","XX");
    if( killer )
	killer->kill_signal( THISO, cause );
    ready_death_items( );
    query_deathObj()->Die(THISO, killer, cause);
    if (killer)
	killer->remove_target(THISO);
    qd_follow();
    destruct(THISO);
    return(0);
}  

status dead_check()
{
    if(present("chalkboard")->query("lesson")=="XX")
	do_erase();
    return 1;
}
