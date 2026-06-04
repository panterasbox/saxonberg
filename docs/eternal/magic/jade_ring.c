// Death - 03/27/94
// Jade ring.  Based on the code from entesia's ring of strength but better
// in that it's only one object instead of two and cleaned up in other ways.
inherit ArmorCode;
inherit IdentifyCode;
inherit "/obj/armor/armor/special/base_ring";
object str;

void extra_create()
{
    set_name("jade ring");
    add_alias("ring");
    set_short("a jade ring");
    set_id_short("A ring of agility");
    set_id_long(
      "Wearing this ring will make you quick!  You will become weaker and\n"+
      "and more frail.\n"
    );
    set_long(
      "This is a ring carved from jade.  An interlocking lace pattern\n"+
      "is inscribed on the surface.\n"+
      "Inside the ring are inscribed some magical runes which you cannot\n"+
      "decipher.\n"
    );
    set( RingP, 1 );
    set( MagicP, 1 );
    set_weight(30);
    set_ac(0);
    set( NoTemperP, 1 );
    set( NoEnchantP, 1 );
    set_value(4000);
}

wear_signal(object wearer)
{
    if (::wear_signal(wearer))
	return 1;
    if (wearer->query_stat("str") < 10 || wearer->query_stat("wil") < 10) {
	write("You are too frail to wear this ring.\n");
	return 1;
    }
}
wear_comm(object wearer)
{
    wearer->add_bonus_object(THISO);
    write("You wear the ring your head begins to swim.\n");
}

void remove_comm(object wearer)
{
    wearer->remove_bonus_object(THISO);
    write("You feel a vague sense of loss.\n");
}


query_stat_bonus(arg)
{
    if (arg=="dex") return 10;
    if(arg=="str") return -5;
    if(arg=="wil") return -5;
}
