inherit "/zone/null/eternal/magic/identify.c";
inherit "/obj/armor/armor/special/base_amulet";
#define UPKEEP 5
#define PERIOD 20
#define BONUS 4
object Owner;
int field, on;

void extra_create()
{
    if (root()) return;
    set_name("black amulet");
    add_alias("black");
    add_alias("AmuletBB");
    add_alias("amulet");
    set_short("a black amulet");
   set( MagicP, 1 );
    set_long("This is an obsidian amulet that looks well worn.\n");
    set_id_long(
      "This amulet aids to your armor when worn.  It takes mana to\n"+
      "upkeep.\n"
    );
    set_id_short("A forcefield amulet");
    set_value(8000);
    set_weight(10);
    set_ac(0);
}
extra_init() {
    Owner=THISP;
    add_action("rub_amulet","rub");
}
int mana_c() {
    if(on) {
	if(Owner->query_mana()<=1) {
	    command("remove AmuletBB",Owner);
	    return 1;
	}
	call_out("mana_c",PERIOD);
	if(!Owner->in_combat())
	{
	    Owner->add_mana(-UPKEEP);
	}
	else
	{
	    Owner->add_mana(-UPKEEP * 2);
	}
    }
    return 1;
}

wear_comm(object wearer)
{
    on=1;
}

raise_field() {
    if(Owner->query_mana() < UPKEEP * 2) {
	tell_object(Owner,"The amulet shimmers briefly.\n");
	return (0);
    }
    tell_room(ENV(Owner),Owner->query_name() + " is enveloped in a dark energy field.\n",({Owner}));
    tell_object(Owner,"You are enveloped in a dark energy field.\n");
    field=1;
    Owner->add_natural_ac(BONUS);
    on=1;
    mana_c();
}

remove_comm(object wearer)
{

    if (field) lower_field();
    on=0;
}

lower_field() {
    if(find_call_out("mana_c"))
	remove_call_out("mana_c");
    Owner->add_natural_ac(-BONUS);
    if(field) {
	tell_room(ENV(Owner),"The dark energy field around "+
	  Owner->query_name() + " dissipates.\n",({Owner}));
	tell_object(Owner,"The energy field around you dissipates.\n");
	field=0;
    }
}

rub_amulet(string arg) {
    if(!id(arg)) return;
    if(THISP!=environment(THISO)) return 0;
    if(!Owner) Owner = THISP;
    say( Owner->query_name() + " rubs a black amulet.\n" );
    tell_object(Owner,"You rub the amulet.\n");

    if (!on) return 1;

    if(!field) {
	raise_field();
	return 1;
    }
    lower_field();
    return 1;
}

extra_look() {
    if (!Owner || !field) return;
    return(capitalize(subjective(Owner)) + " is enveloped in a black "+
      "energy field.\n");
}
