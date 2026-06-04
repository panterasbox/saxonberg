#include "/zone/null/eternal/eternal.h"
#define DAVELOG "/zone/null/eternal/evil/LOG/dave.log"
#define DEATHROOM "/zone/null/eternal/evil/death_room"
inherit MonsterCode;

void extra_create(){
    set_name("dave");
    set_short("Dave, the Dragon of Death");
    set_long(
"You see before you the largest living object you've ever seen.  Heck,\n"+
"Dave is probably the largest object you've seen, aside from a moon or\n"+
"planet or two.  Merely the sight of him drains most of your will to\n"+
"live, or come back.  If you survive this encounter, count yourself among\n"+
"the luckiest mortals alive.\n");
    set_max_damage(20000);
    set_natural_ac(10000);
    set_stat("str", 5000);
    set_stat("dex", 80);
    set_stat("chr", 80);
    set_stat("con", 1000);
    set_stat("int", 5000);
    set_stat("wil", 1000);
    add_combat_message("destroy", "destroys");
    set_type("edged");
    set_heal_rate(20);
    set_heal_amount(random(100000));
    seteuid(getuid(THISO));
    write_file("/zone/null/eternal/evil/LOG/cloned.log", PRNAME+" cloned Dave.\n");
    add_property("MagicP", 1);
    add_property("MetalP", 1);
    add_property("FireproofP", 1);
    add_property("WaterproofP", 1);
    set_alignment(-4000);
}

void utterly_destroy(object lemming){
	object ob1, ob2;
	object newvictim;
	int totstats;
        enable_commands();
	move_object(THISO, environment(lemming));
	write_file(DAVELOG, lemming->query_real_name()+"\n");
	totstats=lemming->query_stat("str");
	totstats+=lemming->query_stat("int");
	totstats+=lemming->query_stat("wil");
	totstats+=lemming->query_stat("con");
	totstats+=lemming->query_stat("dex");
	totstats+=lemming->query_stat("chr");
	shout("Dave, the Dragon of Death ROARS to life!\n");
	shout("Have pity on his victim's soul...\n");
	if(totstats<121){
	   tell_object(lemming, "Dave, the Dragon of Death, has come for "+
		       "you!\n");
	   tell_room(environment(lemming), "Dave, the Dragon of Death, has "+
		       "come for "+lemming->query_name()+".\n",
		       ({ lemming }));
	   tell_room(environment(lemming), "Dave sneers.\n"+
		       "Dave laughs.\n");
	   tell_object(lemming, "Dave says: I will spare you from my wrath "+
		       "this time.\n           _This_ time.\n");
	   tell_room(environment(lemming), "Dave disappears.\n");
	   call_out("bye", 0);
	} else {
	tell_object(lemming,
	   "Dave, the Dragon of Death, has come for you!\n");
	tell_room(environment(lemming),
	   "Dave, the Dragon of Death, has come for "+lemming->query_name()+
	   "!\n", ({lemming}) );
	tell_object(lemming, "Say goodbye, "+lemming->query_name()+".\n");
	tell_room(environment(lemming), lemming->query_name()+" gulps.\n"+
	   lemming->query_name()+" says: goodbye.\n", ({lemming}) );
	tell_object(lemming, "You gulp.\nYou say: goodbye.\n");
        while(ob1=shadow(lemming, 0))
           remove_shadow(ob1);
	lemming->change_stat("wil", 1);
/*
	if(test_property(lemming, "CloneStatsP"))
           remove_property(lemming, "CloneStatsP");
        if(test_property(lemming, "CloneGuildP"))
           remove_property(lemming, "CloneGuildP");
        if(test_property(lemming, "CloneProfsP"))
           remove_property(lemming, "CloneProfsP");
        if(test_property(lemming, "CloneSkillsP"))
           remove_property(lemming, "CloneSkillsP");
*/
        lemming->DeathSequence(THISO, "eaten");
        if(present("corpse of "+lemming->query_real_name(), environment(THISO)))
	move_object(present("corpse of "+lemming->query_real_name(),
          environment(THISO)), DEATHROOM);
	if(random(100)<65){
	   newvictim=users()[random(sizeof(users()))];
	   while(newvictim->query_wizard() || newvictim->query_ghost()){
	      newvictim=users()[random(sizeof(users()))];
	   }
	   call_out("utterly_destroy", 15, newvictim);
	} else call_out("bye", 15);
	}
}

void bye(){ destruct(THISO); }
