inherit ArmorCode;

void extra_create()
{

    set("id",({"gloves","shiny gloves","newbie armor"}));
    set("short","a pair of shiny metal gloves");
    set("long",
      "These gloves are made of a shiny, silverish metal.  They appear "
      "to be brand new.  The metal doesn't look very thick, but they "
      "should offer some protection to your hands."
    );
    set("weight",30);
    set("value",0);
    set("ac",1);
    add("areas","left hand");
    add("areas","right hand");
}
