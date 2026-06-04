inherit MonsterCode;
#include "comm.h"

void extra_create()
{
    set_name("Gretchen");
    set_short("Gretchen the armor smith");
    add_alias("gretchen");
    add_alias("armor smith");
    add_alias("smith");
    set_long(
      "This is Gretchen.  She is an armor smith.  This means that she "
      "makes the armor you can wear to protect yourself from the "
      "attacks of those that would bring harm to you.  She is a tall, "
      "thick woman wearing a dirty apron.  She holds a large hammer and "
      "a pair of tongs, the tools of the trade.");
    set_race("human");
    set_stat("str",55);
    set_stat("con",65);
    set_stat("chr",1);
    set_stat("dex",30);
    set_stat("wil",50);
    set_stat("int",10);
    set_gender("female");
    if(clonep(THISO))
    {
	move_object(clone_object("/zone/null/eternal/school/hammer"),THISO);
	move_object(clone_object("/zone/null/eternal/school/tongs"),THISO);
	command("wield hammer");
    }
}

void extra_init()
{
    add_action("kill_thing","kill");
    add_action("kill_thing","attack");
    add_action("give_armor","armor");
    if(!present("newbie armor",THISP)&&!THISP->query("gretch")&&
      find_call_out("offer_armor")==-1)
	call_out("offer_armor",random(10)+5,THISP);
    if(THISP->query("gretch")&&
      find_call_out("do_greet")==-1)
	call_out("do_greet",random(3)+3,THISP);
}

status offer_armor(object who)
{
    string mess;
    if(!present(who,ENV(THISO)))return 1;
    mess="If yas wants some of my special newbie armors, I just made "
    "up a fresh batch.  Just type 'armor' and I give yas somes.  Ya "
    "wants ta wear armors if yas gonna fight them monstas.";
    Say(THISO,mess);
    call_out("armor_2",random(5)+4,who);
    return 1;
}

status armor_2(object who)
{
    string mess;
    if(!present(who,ENV(THISO)))return 1;
    mess="Yah, armors is important fer the fightin.  Yer gonna wants ta "
    "keep this or other armors ya gets in dem storage places sos ya can use em "
    "agin.";
    Say(THISO,mess);
    return 1;
}

status give_armor(string str)
{
    mixed areas;
    string mess;
    if(str)return 0;
    tell_room(ENV(THISO),PNAME+" asks for some free armor.\n",({THISP}));
    tell_object(THISP,"You ask for some free armor.\n");
    if(THISP->query("gretch")){
	mess="Hey, look like youse already gots some of my armors "
	"before dere, "+PNAME+".  Youse can only gets da free armors "
	"once.  Gos out and gets youse a job or somethins like I did.";
	Say(THISO,mess);
	return 1;
    }
    if(THISP->query_race()=="Teddy Bear"||THISP->query_race()=="Squid")
    {
	mess="Oh hey dere...  Yer one a dose "+THISP->query_race()+"s, "
	"aintcha?  Well alls you kin wear is one o dese here helmets.  Put it on "
	"yer squishy noggin by typin eider 'wear helmet' or dat uhh 'equip' ting "
	"which woulda done put all yer armor on ifn yas could wear smore.";
	Say(THISO,mess);
	tell_room(ENV(THISO),"Gretchen gives a helmet to "+PNAME+".\n",({THISP}));
	tell_object(THISP,"Gretchen gives you a helmet.\n");
	move_object(clone_object("/zone/null/eternal/school/newbie_helmet"),THISP);
	THISP->set("gretch",1);
	return 1;
    }
    mess="Okay dere...  Heres them free armors.  Youse can put em on "
    "buy typin da 'equip' and to takes em off, youse do 'unequip.' "
    "Pretty easy dere, hey?";
    Say(THISO, mess);
    move_object(clone_object("/zone/null/eternal/school/newbie_suit"),THISP);
    move_object(clone_object("/zone/null/eternal/school/newbie_helmet"),THISP);
    move_object(clone_object("/zone/null/eternal/school/newbie_gloves"),THISP);
    move_object(clone_object("/zone/null/eternal/school/newbie_boots"),THISP);
    tell_room(ENV(THISO),"Gretchen hands some armor to "+PNAME+".\n",({THISP}));
    tell_object(THISP,"Gretchen hands you a load of shiny, new armor.\n");
    areas=THISP->query_hit_locations();
    if(member(areas,"tail")!=-1){
	mess="Oh hey, since yas got one o' them tail thingers ta covers, "
	"here's a sharv to puts on it.";
	Say(THISO,mess);
	tell_room(ENV(THISO),"Gretchen hands a sharv to "+PNAME+".\n",({THISP}));
	tell_object(THISP,"Gretchen hands you a shiny new sharv.\n");  
	move_object(clone_object("/zone/null/eternal/school/newbie_sharv"),THISP);
    }
    THISP->set("gretch",1);
    return 1;
}

int kill_thing(string str)
{
    string mess;
    if(!present(str,ENV(THISP)))
	return 0;
    if(id(str))mess="Heys youse!  Don't goes messin wit me unless yas wants "
	"to gets killed!  I gives ya free stuffs and this be the "
	"thanks ya gives me?";
    if(!THISP->query("gretch"))
	mess="Heys youse!  Don't goes messin wit me unless yas wants "
	"to gets killed!";
    if(!id(str))
	mess="Hey youse!  No roughhousings in da lockers room!  "
	"I gots ta do my works here!";
    tell_room(ENV(THISO),PNAME+" attacks "+CAP(str)+"!\n",({THISP,present(str,ENV(THISP))}));
    tell_object(present(str,ENV(THISP)),PNAME+" attacks you!\n");
    Say(THISO,mess);
    tell_room(ENV(THISO),"Gretchen pounds "+PNAME+" with " 
      "her hammer!\n",({THISP}));
    tell_object(THISP,"Gretchen pounds you with her hammer!  Ow!!!\n");
    THISP->add_hp(-(THISP->query_hp()/2));
    THISP->print_hp();
    return 1;
}

status do_greet(object who)
{
    string mess;
    mess="Hey dere, "+who->query_name()+", welcome backs!  How "
    "dat armors suits ya?  It purty good, hey?";
    if(present(who,ENV(THISO)))
	Say(THISO,mess);
    return 1;
}
