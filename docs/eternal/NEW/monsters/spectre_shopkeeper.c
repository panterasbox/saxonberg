/* The Spectral the Shopkeeper */

#define CR "\n"
inherit MonsterCode;
inherit SpecialAttackCode;

void extra_create()
{
    set_name("spectre");
    add_alias("Spectre");
    add_alias("shopkeeper");
    set_race("human");
    set_short("An aethereal spectre, eagerly waiting to serve you");
    set_long("This semisolid image of a floating torso is wearing an"+CR+
      "unnaturally large grin.  It's red eyes flicker as if lit from a fire"+CR+
      "within."+CR
    );
    set_alignment(0);
    set_natural_ac(8);
    set_max_damage(10);
    set_type("fire");
    set_max_hp(400);
    set_max_fatigue(400);
    set_stat("str", 1);
    set_stat("dex", 40);
    set_stat("int", 50);
    set_stat("wil", 300);
    set_stat("con", 10);
    set_stat("chr", 1);
    set_aggressive(0);
    set_heal_rate(20);
    set_heal_amount(10);
    add_special_attack("shatter",THISO,33);
}


shatter(object victim, object attacker)
{
    object *all;
    int obj, i, sdamage;
    string victim_name, attacker_name, weap;
    victim_name=capitalize((string)victim->query_name());
    attacker_name=capitalize((string)attacker->query_name());
    tell_room(environment(attacker),attacker_name + " makes a snapping gesture at "+ victim_name + ".\n",({victim}));
    tell_object(victim,attacker_name + " makes a snapping gesture at you.\n");
    if(!living(victim)) return;
    all=all_inventory(victim);
    if (!all) return;
    obj=random(sizeof(all));
    if(!all[obj]->query_name()) return;
    if(all[obj]->drop()) return;
    if(!all[obj]->get()) return;
    if(!objectp(all[obj] )) return;
    weap=all[obj]->short();
    sdamage = all[obj]->query_weight() / 50 + 10;
    destruct ( all[obj] );
    tell_object(victim, weap + " shatters into dust!\n");
    tell_object(victim,"You are stunned!\n");
    victim->take_damage(0,"magic",sdamage);
    tell_room(environment(victim), attacker_name+" blasts " + weap +
      " from "+victim_name+"'s inventory!\n", ({victim,attacker}));
    return(0);
}                               


