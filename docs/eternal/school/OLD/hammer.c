inherit WeaponCode;

void extra_create()
{
    set("id",({"hammer","mallet","iron hammer"}) );
    set("short","an armor smith's hammer");
    set("long",
      "This is a hammer used by an armor smith to shape malleable "
      "metal into armor.  It looks like it would be painful to be "
      "struck by it." );
    set("material","iron");
    set("type","blunt");
    set("size",5);
    set("proficiency","light club");
    set("handed",1);
    add("combat_message",({"smash","smashes"}));
}
