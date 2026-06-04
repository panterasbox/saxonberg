/*
** small bottle of minor healing potion
** by mordrick
*/

inherit "/obj/healing/healing";

void setup_next_use()
{
    set("heal_hp", 15+random(10));
    set("heal_ftg", 15+random(10));
}

void extra_create()
{
    set("id","small bottle");
    add("id","potion");
    add("id","bottle");
    add("id","small bottle");
    add("id","liquid");
    add("id","blue potion");
    add("id","blue liquid");
    set("short","a small bottle of dark blue liquid");
    set("id_short","a small bottle of minor healing potion");
  set("long","This is a small glass bottle filled with a dark blue liquid.\n");
    set("weight", 25);
    setup_next_use();
    set("heal_uses", 12);
    set("heal_action","drink");
    set("action_msg","You feel better.\n", "");
    set( MagicP, 1 );
}

query("value") { return("heal_uses"*100); }
